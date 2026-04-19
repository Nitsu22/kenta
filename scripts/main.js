(function invitationApp() {
  const config = window.APP_CONFIG || {};

  const form = document.getElementById("rsvp-form");
  const companionsContainer = document.getElementById("companions");
  const addCompanionButton = document.getElementById("add-companion");
  const formStatus = document.getElementById("form-status");
  const submitButton = document.getElementById("submit-btn");

  if (!form) {
    return;
  }

  const submitButtonLabel = submitButton?.textContent || "送信する";

  let companionIndex = 0;

  function setStatus(message, type) {
    if (!formStatus) {
      return;
    }

    formStatus.textContent = message || "";
    formStatus.classList.remove("is-error", "is-success", "is-pending");
    formStatus.setAttribute("role", type === "error" ? "alert" : "status");
    formStatus.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    if (type === "error") {
      formStatus.classList.add("is-error");
    }
    if (type === "success") {
      formStatus.classList.add("is-success");
    }
    if (type === "pending") {
      formStatus.classList.add("is-pending");
    }
  }

  function showStatusMessage(message, type) {
    setStatus(message, type);
    if (!formStatus || !message) {
      return;
    }

    formStatus.scrollIntoView({ block: "center", behavior: "smooth" });
    if (type === "error" || type === "success") {
      formStatus.focus({ preventScroll: true });
    }
  }

  function setSubmitLoading(isLoading) {
    if (!submitButton) {
      return;
    }

    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? "送信中..." : submitButtonLabel;
  }

  function getSubmitErrorMessage() {
    return "送信できませんでした。入力内容は消えていません。通信状況を確認して、もう一度「送信する」を押してください。うまくいかない場合は、この画面を閉じずに主催者へご連絡ください。";
  }

  function buildCompanionRow(values) {
    const row = document.createElement("div");
    row.className = "companion-row";
    row.dataset.index = String(companionIndex);
    companionIndex += 1;

    row.innerHTML = `
      <div class="field">
        <label>お名前</label>
        <input type="text" class="companion-name" maxlength="60" placeholder="山田 花子" value="${values?.name ?? ""}">
      </div>
      <button type="button" class="remove-btn">削除</button>
      <div class="field">
        <label>アレルギー補足（任意）</label>
        <input type="text" class="companion-allergy" maxlength="200" placeholder="えび、卵" value="${values?.allergy ?? ""}">
      </div>
    `;

    const removeButton = row.querySelector(".remove-btn");
    if (removeButton) {
      removeButton.addEventListener("click", () => {
        row.remove();
      });
    }

    companionsContainer.appendChild(row);
  }

  function getCompanions() {
    const rows = companionsContainer.querySelectorAll(".companion-row");
    return Array.from(rows)
      .map((row) => {
        const name = row.querySelector(".companion-name")?.value.trim() || "";
        const allergy = row.querySelector(".companion-allergy")?.value.trim() || "";
        return { name, allergy };
      })
      .filter((item) => item.name.length > 0 || item.allergy.length > 0);
  }

  function resetCompanions() {
    companionsContainer.innerHTML = "";
    companionIndex = 0;
  }

  function installCustomValidationMessages() {
    const guestNameInput = document.getElementById("guest_name");
    const telephoneInput = document.getElementById("telephone");

    if (guestNameInput) {
      guestNameInput.addEventListener("input", () => {
        if (guestNameInput.value && guestNameInput.value.trim().length === 0) {
          guestNameInput.setCustomValidity("お名前を入力してください。");
        } else {
          guestNameInput.setCustomValidity("");
        }
      });
    }

    if (telephoneInput) {
      telephoneInput.addEventListener("input", () => {
        const regex = /^\d{8,11}$/;
        if (telephoneInput.value && !regex.test(telephoneInput.value)) {
          telephoneInput.setCustomValidity("ハイフンなし8〜11桁で入力してください。");
        } else {
          telephoneInput.setCustomValidity("");
        }
      });
    }
  }

  function startHeroSlideshow() {
    const slides = Array.from(document.querySelectorAll(".hero-slide"));
    if (slides.length <= 1) {
      return;
    }

    let current = 0;
    setInterval(() => {
      slides[current].classList.remove("is-active");
      current = (current + 1) % slides.length;
      slides[current].classList.add("is-active");
    }, 7000);
  }

  function startCountdown() {
    const dayNode = document.getElementById("days");
    const hourNode = document.getElementById("hours");
    const minuteNode = document.getElementById("minutes");
    const secondNode = document.getElementById("seconds");
    if (!dayNode || !hourNode || !minuteNode || !secondNode) {
      return;
    }

    const targetDate = new Date(config.targetDate || "2026-07-11T11:00:00+09:00");

    const update = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) {
        dayNode.textContent = "0";
        hourNode.textContent = "00";
        minuteNode.textContent = "00";
        secondNode.textContent = "00";
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      dayNode.textContent = String(days);
      hourNode.textContent = String(hours).padStart(2, "0");
      minuteNode.textContent = String(minutes).padStart(2, "0");
      secondNode.textContent = String(seconds).padStart(2, "0");
    };

    update();
    setInterval(update, 1000);
  }

  async function submitToSupabase(payload, imageFile) {
    if (typeof window.createSupabaseClient !== "function") {
      throw new Error("Supabaseクライアントが初期化されていません。");
    }

    const { client, error: initError } = window.createSupabaseClient();
    if (initError) {
      throw new Error(initError);
    }

    let messageImageUrl = "なし";
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.includes(".") ? imageFile.name.split('.').pop() : "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const bucket = config.supabaseImageBucket || "message-images";
      const { error: uploadError } = await client.storage
        .from(bucket)
        .upload(fileName, imageFile, { upsert: false });
      if (uploadError) {
        throw uploadError;
      }
      const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(fileName);
      messageImageUrl = publicUrlData?.publicUrl || "なし";
    }

    const table = config.supabaseTable || "invitation_responses";
    const { error } = await client.from(table).insert({
      ...payload,
      message_image_url: messageImageUrl
    });
    if (error) {
      throw error;
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setStatus("", "");

    if (!form.reportValidity()) {
      setStatus("入力内容を確認してください。", "error");
      return;
    }

    if (navigator.onLine === false) {
      showStatusMessage("インターネットに接続されていないため、送信できませんでした。接続を確認してから、もう一度「送信する」を押してください。", "error");
      return;
    }

    const formData = new FormData(form);
    const guestNameInput = document.getElementById("guest_name");
    if (guestNameInput && String(formData.get("guest_name") || "").trim().length === 0) {
      guestNameInput.setCustomValidity("お名前を入力してください。");
      form.reportValidity();
      setStatus("入力内容を確認してください。", "error");
      return;
    }

    const payload = {
      source_url: window.location.href,
      attendance_status: String(formData.get("attendance_status") || ""),
      stay_0710: String(formData.get("stay_0710") || "記入なし"),
      bus_use: String(formData.get("bus_use") || "記入なし"),
      guest_name: String(formData.get("guest_name") || "").trim(),
      telephone: String(formData.get("telephone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      allergy_note: String(formData.get("allergy_note") || "").trim() || "なし",
      companions: getCompanions(),
      save_info: false,
      metadata: {
        language: navigator.language,
        user_agent: navigator.userAgent,
        submitted_at_client: new Date().toISOString()
      }
    };

    try {
      setSubmitLoading(true);
      setStatus("送信中です。画面を閉じずにお待ちください。", "pending");
      await submitToSupabase(payload, null);

      form.reset();
      resetCompanions();
      showStatusMessage("送信が完了しました。ご回答ありがとうございました。", "success");
    } catch (error) {
      console.error("RSVP submission failed", error);
      showStatusMessage(getSubmitErrorMessage(), "error");
    } finally {
      setSubmitLoading(false);
    }
  }

  addCompanionButton?.addEventListener("click", () => {
    buildCompanionRow();
  });

  form.addEventListener("submit", onSubmit);

  installCustomValidationMessages();
  startHeroSlideshow();
  startCountdown();
})();
