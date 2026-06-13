import crypto from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const defaultKeyPath = path.join(repoRoot, "memory/private/firebase-service-account.json");
const outputDir = path.join(repoRoot, "memory/exports");

const args = process.argv.slice(2);
const parsedArgs = parseArgs(args);
const collectionPath = parsedArgs.collectionPath;
const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || defaultKeyPath;

function parseArgs(values) {
  let collectionPath = "invitation_responses";
  let hasCollectionPath = false;
  let emailTo = "";

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === "--email" || value === "--to") {
      emailTo = values[index + 1] || "";
      index += 1;
      continue;
    }

    if (value.startsWith("--email=")) {
      emailTo = value.slice("--email=".length);
      continue;
    }

    if (value.startsWith("--to=")) {
      emailTo = value.slice("--to=".length);
      continue;
    }

    if (!value.startsWith("--") && !hasCollectionPath) {
      collectionPath = value;
      hasCollectionPath = true;
    }
  }

  return { collectionPath, emailTo };
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claimSet))}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsignedToken)
    .sign(serviceAccount.private_key);
  return `${unsignedToken}.${base64Url(signature)}`;
}

async function readServiceAccount() {
  try {
    const raw = await fs.readFile(keyPath, "utf8");
    const serviceAccount = JSON.parse(raw);
    if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.project_id) {
      throw new Error("client_email / private_key / project_id が見つかりません。");
    }
    return serviceAccount;
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("FirebaseのJSONがありません。memory/private/firebase-service-account.json に入れてください。");
    }
    throw error;
  }
}

async function getAccessToken(serviceAccount) {
  const jwt = signJwt(serviceAccount);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firebase認証に失敗しました。${response.status} ${text}`);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

function encodeCollectionPath(value) {
  return value.split("/").map(encodeURIComponent).join("/");
}

async function fetchDocuments({ accessToken, projectId }) {
  const documents = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encodeCollectionPath(collectionPath)}`
    );
    url.searchParams.set("pageSize", "1000");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Firestoreの取得に失敗しました。${response.status} ${text}`);
    }

    const data = await response.json();
    documents.push(...(data.documents || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return documents;
}

function convertValue(value) {
  if (!value || "nullValue" in value) return "";
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return value.integerValue;
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("stringValue" in value) return value.stringValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map(convertValue);
  }
  if ("mapValue" in value) {
    const fields = value.mapValue.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([key, fieldValue]) => [key, convertValue(fieldValue)]));
  }
  return "";
}

function flattenObject(value, prefix = "", output = {}) {
  Object.entries(value).forEach(([key, item]) => {
    const columnName = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === "object" && !Array.isArray(item)) {
      flattenObject(item, columnName, output);
      return;
    }
    output[columnName] = item;
  });
  return output;
}

function documentId(documentName) {
  return documentName.split("/").pop() || "";
}

function documentPath(documentName) {
  const marker = "/documents/";
  const markerIndex = documentName.indexOf(marker);
  return markerIndex >= 0 ? documentName.slice(markerIndex + marker.length) : documentName;
}

function csvCell(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function documentsToCsv(documents) {
  const rows = documents.map((document) => {
    const fields = document.fields || {};
    const convertedFields = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, convertValue(value)])
    );
    return {
      id: documentId(document.name),
      path: documentPath(document.name),
      ...flattenObject(convertedFields)
    };
  });

  const columns = [
    "id",
    "path",
    ...Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
      .filter((column) => column !== "id" && column !== "path")
      .sort()
  ];

  const lines = [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))
  ];
  return `${lines.join("\n")}\n`;
}

function outputFilePath() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeCollectionName = collectionPath.replace(/[^a-zA-Z0-9_-]+/g, "_");
  return path.join(outputDir, `${safeCollectionName}-${timestamp}.csv`);
}

function assertEmailAddress(value) {
  const trimmedValue = String(value || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
    throw new Error("送信先メールアドレスが正しくありません。");
  }
  return trimmedValue;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が設定されていません。`);
  }
  return value;
}

function extractEmailAddress(value) {
  const match = String(value).match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}

function sanitizeHeader(value) {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function foldBase64(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/.{1,76}/g, "$&\r\n")
    .trimEnd();
}

function dotStuff(value) {
  return value
    .replace(/\r?\n/g, "\r\n")
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

function createMimeMessage({ from, to, subject, body, attachmentFilename, attachmentText }) {
  const boundary = `kenta-${crypto.randomBytes(12).toString("hex")}`;
  const safeFilename = sanitizeHeader(attachmentFilename);
  const lines = [
    `From: ${sanitizeHeader(from)}`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
    "",
    `--${boundary}`,
    `Content-Type: text/csv; charset=UTF-8; name="${safeFilename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${safeFilename}"`,
    "",
    foldBase64(attachmentText),
    "",
    `--${boundary}--`,
    ""
  ];
  return lines.join("\r\n");
}

function parseSmtpCode(response) {
  const match = response.match(/^(\d{3})/);
  return match ? Number(match[1]) : 0;
}

function isCompleteSmtpResponse(buffer) {
  if (!/\r?\n$/.test(buffer)) return false;
  const lines = buffer.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return false;
  const code = lines[0].slice(0, 3);
  return lines.some((line) => line.startsWith(`${code} `));
}

function connectSocket({ host, port, secure }) {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host }, () => resolve(socket))
      : net.connect({ host, port }, () => resolve(socket));

    socket.once("error", reject);
  });
}

function upgradeToTls(socket, host) {
  return new Promise((resolve, reject) => {
    socket.removeAllListeners("data");
    socket.removeAllListeners("error");
    const secureSocket = tls.connect({ socket, servername: host }, () => resolve(secureSocket));
    secureSocket.once("error", reject);
  });
}

function createSmtpSession(initialSocket) {
  let socket = initialSocket;
  let buffer = "";
  const waiters = [];

  function attach(nextSocket) {
    socket = nextSocket;
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
      drain();
    });
  }

  function drain() {
    while (waiters.length > 0 && isCompleteSmtpResponse(buffer)) {
      const response = buffer;
      buffer = "";
      waiters.shift()(response);
    }
  }

  function readResponse() {
    if (isCompleteSmtpResponse(buffer)) {
      const response = buffer;
      buffer = "";
      return Promise.resolve(response);
    }

    return new Promise((resolve) => {
      waiters.push(resolve);
    });
  }

  function setSocket(nextSocket) {
    buffer = "";
    waiters.length = 0;
    attach(nextSocket);
  }

  function write(value) {
    socket.write(value);
  }

  function end() {
    socket.end();
  }

  attach(initialSocket);
  return { readResponse, setSocket, write, end };
}

async function expectResponse(session, expectedCodes) {
  const response = await session.readResponse();
  const code = parseSmtpCode(response);
  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP送信に失敗しました。コード: ${code}`);
  }
  return response;
}

async function sendCommand(session, command, expectedCodes) {
  session.write(`${command}\r\n`);
  return expectResponse(session, expectedCodes);
}

async function sendCsvEmail({ to, csv, filename }) {
  const host = requireEnv("SMTP_HOST");
  const port = Number(requireEnv("SMTP_PORT"));
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");
  const from = process.env.SMTP_FROM || user;
  const fromEmail = extractEmailAddress(from);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT が正しくありません。");
  }

  const socket = await connectSocket({ host, port, secure });
  const session = createSmtpSession(socket);

  try {
    await expectResponse(session, [220]);
    await sendCommand(session, `EHLO ${process.env.SMTP_EHLO || "localhost"}`, [250]);

    if (!secure) {
      await sendCommand(session, "STARTTLS", [220]);
      const secureSocket = await upgradeToTls(socket, host);
      session.setSocket(secureSocket);
      await sendCommand(session, `EHLO ${process.env.SMTP_EHLO || "localhost"}`, [250]);
    }

    await sendCommand(session, "AUTH LOGIN", [334]);
    await sendCommand(session, Buffer.from(user, "utf8").toString("base64"), [334]);
    await sendCommand(session, Buffer.from(pass, "utf8").toString("base64"), [235]);
    await sendCommand(session, `MAIL FROM:<${fromEmail}>`, [250]);
    await sendCommand(session, `RCPT TO:<${to}>`, [250, 251]);
    await sendCommand(session, "DATA", [354]);

    const message = createMimeMessage({
      from,
      to,
      subject: "参加者CSV",
      body: "参加者CSVは以下です。",
      attachmentFilename: filename,
      attachmentText: csv
    });
    session.write(`${dotStuff(message)}\r\n.\r\n`);
    await expectResponse(session, [250]);
    await sendCommand(session, "QUIT", [221]);
  } finally {
    session.end();
  }
}

async function main() {
  const serviceAccount = await readServiceAccount();
  const accessToken = await getAccessToken(serviceAccount);
  const documents = await fetchDocuments({ accessToken, projectId: serviceAccount.project_id });
  const csv = documentsToCsv(documents);
  const filePath = outputFilePath();

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, csv, "utf8");

  if (parsedArgs.emailTo) {
    const emailTo = assertEmailAddress(parsedArgs.emailTo);
    await sendCsvEmail({
      to: emailTo,
      csv,
      filename: path.basename(filePath)
    });
    console.log(`${emailTo} に送信しました。`);
    return;
  }

  console.log("CSVを作成しました。");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
