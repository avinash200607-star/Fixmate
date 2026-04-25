const searchForm = document.querySelector(".search-bar");
const searchInput = document.querySelector(".search-bar input");
const serviceButtons = document.querySelectorAll(".service-card button");
const serviceCards = document.querySelectorAll(".service-card");
const servicesSection = document.getElementById("services");
const chatbotToggle = document.getElementById("chatbot-toggle");
const chatbotWindow = document.getElementById("chatbot-window");
const chatbotClose = document.getElementById("chatbot-close");
const chatbotForm = document.getElementById("chatbot-form");
const chatbotInput = document.getElementById("chatbot-input");
const chatbotMessages = document.getElementById("chatbot-messages");
const STORAGE_KEY = "selectedService";

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = searchInput?.value.trim().toLowerCase() || "";
    filterServices(query);
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

const clearMatchState = () => {
  serviceCards.forEach((card) => {
    card.classList.remove("service-hidden", "service-match");
  });
};

const filterServices = (query) => {
  clearMatchState();
  if (!query) {
    return;
  }

  serviceCards.forEach((card) => {
    const title = card.querySelector("h3")?.textContent?.toLowerCase() || "";
    const desc = card.querySelector("p")?.textContent?.toLowerCase() || "";
    const isMatch = title.includes(query) || desc.includes(query);

    if (isMatch) {
      card.classList.add("service-match");
    } else {
      card.classList.add("service-hidden");
    }
  });
};

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    filterServices(query);
  });
}

serviceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const serviceName = button.closest(".service-card")?.querySelector("h3")?.textContent?.trim() || "";
    if (serviceName) {
      localStorage.setItem(STORAGE_KEY, serviceName);
      // Redirect to providers page with service filter
      window.location.href = `providers.html?service=${encodeURIComponent(serviceName)}`;
    } else {
      window.location.href = "providers.html";
    }
  });
});

const addChatMessage = (text, sender) => {
  if (!chatbotMessages) return;
  const item = document.createElement("div");
  item.className = `chatbot-msg ${sender}`;
  item.textContent = text;
  chatbotMessages.appendChild(item);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
};

const getBotSuggestion = (query) => {
  const q = query.toLowerCase();
  if (q.includes("ac") || q.includes("cool")) return "Try AC Repair for fast cooling issue resolution.";
  if (q.includes("clean")) return "Cleaning is perfect for this. We offer deep home cleaning slots.";
  if (q.includes("electric") || q.includes("light") || q.includes("switch")) return "Electrician service is recommended for safe repairs.";
  if (q.includes("plumb") || q.includes("leak") || q.includes("tap")) return "Plumbing is your best match for leaks and pipe issues.";
  if (q.includes("paint")) return "Painting service can help refresh your space quickly.";
  if (q.includes("pest") || q.includes("bug")) return "Pest Control is ideal for this problem.";
  if (q.includes("salon") || q.includes("hair") || q.includes("beauty")) return "Salon at Home is available with verified professionals.";
  return "You can choose AC Repair, Cleaning, Electrician, Plumbing, Painting, or more. Tell me your issue.";
};

if (chatbotToggle && chatbotWindow) {
  chatbotToggle.addEventListener("click", () => {
    chatbotWindow.classList.toggle("hidden");
    chatbotToggle.setAttribute("aria-expanded", String(!chatbotWindow.classList.contains("hidden")));
  });
}

if (chatbotClose && chatbotWindow && chatbotToggle) {
  chatbotClose.addEventListener("click", () => {
    chatbotWindow.classList.add("hidden");
    chatbotToggle.setAttribute("aria-expanded", "false");
  });
}

if (chatbotForm && chatbotInput) {
  chatbotForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatbotInput.value.trim();
    if (!text) return;
    addChatMessage(text, "user");
    setTimeout(() => addChatMessage(getBotSuggestion(text), "bot"), 220);
    chatbotInput.value = "";
  });
}
