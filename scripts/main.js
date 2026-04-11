(function invitationApp() {
  const config = window.APP_CONFIG || {};

  const form = document.getElementById("rsvp-form");
  const companionsContainer = document.getElementById("companions");
  const addCompanionButton = document.getElementById("add-companion");
  const postcodeInput = document.getElementById("postcode");
  const saveInfoCheckbox = document.getElementById("save_info");
  const formStatus = document.getElementById("form-status");
  const submitButton = document.getElementById("submit-btn");

  if (!form) {
    return;
  }

  const draftStorageKey = config.draftStorageKey || "museum_invitation_form_v1";

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
        const allergy = row.querySelector(".companion-allergy")?.value.trim() || "";
        return { name, allergy };
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
      bus_use: String(formData.get("bus_use") || "希望する"),
      guest_name: String(formData.get("guest_name") || ""),
      last_name_kana: String(formData.get("last_name_kana") || ""),
      first_name_kana: String(formData.get("first_name_kana") || ""),
      telephone: String(formData.get("telephone") || ""),
      postcode: String(formData.get("postcode") || ""),
      email: String(formData.get("email") || ""),
      allergy_note: String(formData.get("allergy_note") || ""),
      companions: getCompanions(),
      save_info: true
    };
    localStorage.setItem(draftStorageKey, JSON.stringify(payload));
  }

  function applyDraft() {
    const raw = localStorage.getItem(draftStorageKey);
    if (!raw) {
      return;
    }

    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") {
        return;
      }

      saveInfoCheckbox.checked = Boolean(data.save_info);
      setRadioValue("attendance_status", data.attendance_status || "attend");
      setRadioValue("stay_0710", data.stay_0710 || "希望する");
      setRadioValue("bus_use", data.bus_use || "希望する");

      const valueFieldMap = {
        guest_name: "guest_name",
        last_name_kana: "last_name_kana",
        first_name_kana: "first_name_kana",
        telephone: "telephone",
        postcode: "postcode",
        email: "email",
        allergy_note: "allergy_note"
      };

      Object.entries(valueFieldMap).forEach(([id, key]) => {
        const field = document.getElementById(id);
        if (field && typeof data[key] === "string") {
          field.value = data[key];
        }
      });

      resetCompanions();
      const companionValues = Array.isArray(data.companions) ? data.companions : [];
      companionValues.forEach((item) => buildCompanionRow(item));
    } catch (_error) {
      // 保存データが壊れている場合は無視。
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

    let messageImageUrl = null;
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
      messageImageUrl = publicUrlData?.publicUrl || null;
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

    const formData = new FormData(form);
    const payload = {
      source_url: window.location.href,
      attendance_status: String(formData.get("attendance_status") || ""),
      stay_0710: String(formData.get("stay_0710") || ""),
      bus_use: String(formData.get("bus_use") || ""),
      guest_name: String(formData.get("guest_name") || "").trim(),
      last_name_kana: String(formData.get("last_name_kana") || "").trim(),
      first_name_kana: String(formData.get("first_name_kana") || "").trim(),
      telephone: String(formData.get("telephone") || "").trim(),
      postcode: String(formData.get("postcode") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      allergy_note: String(formData.get("allergy_note") || "").trim() || null,
      companions: getCompanions(),
      save_info: formData.get("save_info") === "1",
      metadata: {
        language: navigator.language,
        user_agent: navigator.userAgent,
        submitted_at_client: new Date().toISOString()
      }
    };

    try {
      submitButton.disabled = true;
      await submitToSupabase(payload, null);

      if (payload.save_info) {
        saveDraft();
      } else {
        localStorage.removeItem(draftStorageKey);
      }

      setStatus("送信が完了しました。ご回答ありがとうございました。", "success");
      form.reset();
      resetCompanions();
      window.scrollTo({ top: form.offsetTop - 40, behavior: "smooth" });
    } catch (error) {
      setStatus(`送信に失敗しました: ${error.message || "不明なエラー"}`, "error");
    } finally {
      submitButton.disabled = false;
    }
  }

  relationSelect.addEventListener("change", () => {
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

  applyDraft();
  installCustomValidationMessages();
  startHeroSlideshow();
  startCountdown();
})();
