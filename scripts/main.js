(function invitationApp() {
  const config = window.APP_CONFIG || {};

  const form = document.getElementById("rsvp-form");
  const relationSelect = document.getElementById("relation");
  const subRelationSelect = document.getElementById("sub_relation");
  const companionsContainer = document.getElementById("companions");
  const addCompanionButton = document.getElementById("add-companion");
  const postcodeInput = document.getElementById("postcode");
  const addressInput = document.getElementById("address");
  const saveInfoCheckbox = document.getElementById("save_info");
  const formStatus = document.getElementById("form-status");
  const submitButton = document.getElementById("submit-btn");

  if (!form || !relationSelect || !subRelationSelect) {
    return;
  }

  const draftStorageKey = config.draftStorageKey || "museum_invitation_form_v1";
  const relationMap = {
    親族: [
      "父",
      "母",
      "兄",
      "弟",
      "姉",
      "妹",
      "義姉",
      "義兄",
      "義妹",
      "義弟",
      "祖父",
      "祖母",
      "伯父",
      "伯母",
      "叔父",
      "叔母",
      "従兄",
      "従姉",
      "従弟",
      "従妹",
      "甥",
      "姪",
      "親戚",
      "配偶者",
      "息子",
      "娘"
    ],
    友人: ["幼なじみ", "友人", "知人", "大学友人", "高校友人", "中学友人"],
    学校: ["大学先輩", "高校先輩", "中学先輩", "大学後輩", "高校後輩", "中学後輩", "恩師"],
    会社: ["社長", "上司", "先輩", "同僚", "元同僚", "後輩"],
    その他: ["その他"]
  };

  let companionIndex = 0;

  function setStatus(message, type) {
    formStatus.textContent = message || "";
    formStatus.classList.remove("is-error", "is-success");
    if (type === "error") {
      formStatus.classList.add("is-error");
    }
    if (type === "success") {
      formStatus.classList.add("is-success");
    }
  }

  function createSelectOptions(selectElement, options, placeholder) {
    selectElement.innerHTML = "";
    const head = document.createElement("option");
    head.value = "";
    head.textContent = placeholder;
    selectElement.appendChild(head);

    options.forEach((option) => {
      const item = document.createElement("option");
      item.value = option;
      item.textContent = option;
      selectElement.appendChild(item);
    });
  }

  function updateSubRelationOptions(selectedValue) {
    const relation = relationSelect.value;
    if (!relation || !relationMap[relation]) {
      createSelectOptions(subRelationSelect, [], "先に「ご関係」を選択してください");
      return;
    }

    createSelectOptions(subRelationSelect, relationMap[relation], "選択してください");

    if (selectedValue && relationMap[relation].includes(selectedValue)) {
      subRelationSelect.value = selectedValue;
    }
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
      <div class="field">
        <label>区分</label>
        <select class="companion-type">
          <option value="ご成人">ご成人</option>
          <option value="お子様">お子様</option>
        </select>
      </div>
      <div class="field">
        <label>性別</label>
        <select class="companion-gender">
          <option value="男性">男性</option>
          <option value="女性">女性</option>
          <option value="その他">その他</option>
        </select>
      </div>
      <button type="button" class="remove-btn">削除</button>
      <div class="field">
        <label>アレルギー補足（任意）</label>
        <input type="text" class="companion-allergy" maxlength="200" placeholder="えび、卵" value="${values?.allergy ?? ""}">
      </div>
    `;

    const typeSelect = row.querySelector(".companion-type");
    const genderSelect = row.querySelector(".companion-gender");
    if (typeSelect && values?.type) {
      typeSelect.value = values.type;
    }
    if (genderSelect && values?.gender) {
      genderSelect.value = values.gender;
    }

    const removeButton = row.querySelector(".remove-btn");
    if (removeButton) {
      removeButton.addEventListener("click", () => {
        row.remove();
        if (saveInfoCheckbox.checked) {
          saveDraft();
        }
      });
    }

    companionsContainer.appendChild(row);
  }

  function getCompanions() {
    const rows = companionsContainer.querySelectorAll(".companion-row");
    return Array.from(rows)
      .map((row) => {
        const name = row.querySelector(".companion-name")?.value.trim() || "";
        const type = row.querySelector(".companion-type")?.value || "ご成人";
        const gender = row.querySelector(".companion-gender")?.value || "その他";
        const allergy = row.querySelector(".companion-allergy")?.value.trim() || "";
        return { name, type, gender, allergy };
      })
      .filter((item) => item.name.length > 0 || item.allergy.length > 0);
  }

  function resetCompanions() {
    companionsContainer.innerHTML = "";
    companionIndex = 0;
  }

  function setRadioValue(name, value) {
    const inputs = form.querySelectorAll(`input[name="${name}"]`);
    inputs.forEach((input) => {
      input.checked = input.value === value;
    });
  }

  function saveDraft() {
    if (!saveInfoCheckbox.checked) {
      localStorage.removeItem(draftStorageKey);
      return;
    }

    const formData = new FormData(form);
    const payload = {
      attendance_status: String(formData.get("attendance_status") || "attend"),
      stay_0710: String(formData.get("stay_0710") || "希望する"),
      relation: String(formData.get("relation") || ""),
      sub_relation: String(formData.get("sub_relation") || ""),
      last_name: String(formData.get("last_name") || ""),
      first_name: String(formData.get("first_name") || ""),
      last_name_kana: String(formData.get("last_name_kana") || ""),
      first_name_kana: String(formData.get("first_name_kana") || ""),
      gender: String(formData.get("gender") || "male"),
      telephone: String(formData.get("telephone") || ""),
      postcode: String(formData.get("postcode") || ""),
      address: String(formData.get("address") || ""),
      email: String(formData.get("email") || ""),
      allergies: formData.getAll("allergies").map((value) => String(value)),
      allergy_note: String(formData.get("allergy_note") || ""),
      message_image_url: String(formData.get("message_image_url") || ""),
      message: String(formData.get("message") || ""),
      companions: getCompanions(),
      save_info: true
    };
    localStorage.setItem(draftStorageKey, JSON.stringify(payload));
  }

  function applyDraft() {
    const raw = localStorage.getItem(draftStorageKey);
    if (!raw) {
      updateSubRelationOptions("");
      return;
    }

    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") {
        updateSubRelationOptions("");
        return;
      }

      saveInfoCheckbox.checked = Boolean(data.save_info);
      setRadioValue("attendance_status", data.attendance_status || "attend");
      setRadioValue("stay_0710", data.stay_0710 || "希望する");
      setRadioValue("gender", data.gender || "male");

      relationSelect.value = data.relation || "";
      updateSubRelationOptions(data.sub_relation || "");

      const valueFieldMap = {
        last_name: "last_name",
        first_name: "first_name",
        last_name_kana: "last_name_kana",
        first_name_kana: "first_name_kana",
        telephone: "telephone",
        postcode: "postcode",
        address: "address",
        email: "email",
        allergy_note: "allergy_note",
        message_image_url: "message_image_url",
        message: "message"
      };

      Object.entries(valueFieldMap).forEach(([id, key]) => {
        const field = document.getElementById(id);
        if (field && typeof data[key] === "string") {
          field.value = data[key];
        }
      });

      const savedAllergies = Array.isArray(data.allergies) ? data.allergies : [];
      const allergyInputs = form.querySelectorAll('input[name="allergies"]');
      allergyInputs.forEach((input) => {
        input.checked = savedAllergies.includes(input.value);
      });

      resetCompanions();
      const companionValues = Array.isArray(data.companions) ? data.companions : [];
      companionValues.forEach((item) => buildCompanionRow(item));
    } catch (_error) {
      updateSubRelationOptions("");
    }
  }

  function installCustomValidationMessages() {
    const kanaInputs = form.querySelectorAll('input[name="last_name_kana"], input[name="first_name_kana"]');
    kanaInputs.forEach((input) => {
      input.addEventListener("input", () => {
        const regex = /^[ァ-ヶー]+$/;
        if (input.value && !regex.test(input.value)) {
          input.setCustomValidity("カナ入力のみ可能です。");
        } else {
          input.setCustomValidity("");
        }
      });
    });

    if (postcodeInput) {
      postcodeInput.addEventListener("input", () => {
        const regex = /^\d{7}$/;
        if (postcodeInput.value && !regex.test(postcodeInput.value)) {
          postcodeInput.setCustomValidity("ハイフンなし7桁で入力してください。");
        } else {
          postcodeInput.setCustomValidity("");
        }
      });
    }

    const telephoneInput = document.getElementById("telephone");
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

  async function tryFillAddressByPostcode() {
    if (!postcodeInput || !addressInput) {
      return;
    }
    const zipcode = postcodeInput.value.replace(/\D/g, "");
    if (zipcode.length !== 7) {
      return;
    }

    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`);
      if (!response.ok) {
        return;
      }
      const body = await response.json();
      const result = body?.results?.[0];
      if (result) {
        addressInput.value = `${result.address1}${result.address2}${result.address3}`;
      }
    } catch (_error) {
      // 郵便番号APIの失敗時は無視し、手入力を継続。
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

  async function submitToSupabase(payload) {
    if (typeof window.createSupabaseClient !== "function") {
      throw new Error("Supabaseクライアントが初期化されていません。");
    }

    const { client, error: initError } = window.createSupabaseClient();
    if (initError) {
      throw new Error(initError);
    }

    const table = config.supabaseTable || "invitation_responses";
    const { error } = await client.from(table).insert(payload);
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

    const formData = new FormData(form);
    const payload = {
      source_url: window.location.href,
      attendance_status: String(formData.get("attendance_status") || ""),
      stay_0710: String(formData.get("stay_0710") || ""),
      relation: String(formData.get("relation") || ""),
      sub_relation: String(formData.get("sub_relation") || ""),
      last_name: String(formData.get("last_name") || "").trim(),
      first_name: String(formData.get("first_name") || "").trim(),
      last_name_kana: String(formData.get("last_name_kana") || "").trim(),
      first_name_kana: String(formData.get("first_name_kana") || "").trim(),
      gender: String(formData.get("gender") || ""),
      telephone: String(formData.get("telephone") || "").trim(),
      postcode: String(formData.get("postcode") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      allergies: formData.getAll("allergies").map((item) => String(item)),
      allergy_note: String(formData.get("allergy_note") || "").trim() || null,
      companions: getCompanions(),
      message_image_url: String(formData.get("message_image_url") || "").trim() || null,
      message: String(formData.get("message") || "").trim() || null,
      save_info: formData.get("save_info") === "1",
      metadata: {
        language: navigator.language,
        user_agent: navigator.userAgent,
        submitted_at_client: new Date().toISOString()
      }
    };

    try {
      submitButton.disabled = true;
      await submitToSupabase(payload);

      if (payload.save_info) {
        saveDraft();
      } else {
        localStorage.removeItem(draftStorageKey);
      }

      setStatus("送信が完了しました。ご回答ありがとうございました。", "success");
      form.reset();
      resetCompanions();
      updateSubRelationOptions("");
      window.scrollTo({ top: form.offsetTop - 40, behavior: "smooth" });
    } catch (error) {
      setStatus(`送信に失敗しました: ${error.message || "不明なエラー"}`, "error");
    } finally {
      submitButton.disabled = false;
    }
  }

  relationSelect.addEventListener("change", () => {
    updateSubRelationOptions("");
    if (saveInfoCheckbox.checked) {
      saveDraft();
    }
  });

  addCompanionButton?.addEventListener("click", () => {
    buildCompanionRow();
    if (saveInfoCheckbox.checked) {
      saveDraft();
    }
  });

  saveInfoCheckbox.addEventListener("change", () => {
    if (saveInfoCheckbox.checked) {
      saveDraft();
    } else {
      localStorage.removeItem(draftStorageKey);
    }
  });

  form.addEventListener("input", () => {
    if (saveInfoCheckbox.checked) {
      saveDraft();
    }
  });

  form.addEventListener("change", () => {
    if (saveInfoCheckbox.checked) {
      saveDraft();
    }
  });

  form.addEventListener("submit", onSubmit);

  postcodeInput?.addEventListener("blur", tryFillAddressByPostcode);
  postcodeInput?.addEventListener("change", tryFillAddressByPostcode);

  applyDraft();
  installCustomValidationMessages();
  startHeroSlideshow();
  startCountdown();
})();
