const form = document.getElementById("wordForm");
const input = document.getElementById("slovakWord");
const directionSelect = document.getElementById("direction");
const sourceLabel = document.getElementById("sourceLabel");
const translationHeading = document.getElementById("translationHeading");
const button = document.getElementById("generateBtn");
const statusText = document.getElementById("status");
const result = document.getElementById("result");
const resultActions = document.getElementById("resultActions");
const saveFavoriteBtn = document.getElementById("saveFavoriteBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const translationText = document.getElementById("translationText");
const easySentenceText = document.getElementById("easySentenceText");
const descriptionText = document.getElementById("descriptionText");
const synonymText = document.getElementById("synonymText");
const wordImage = document.getElementById("wordImage");
const imageFallback = document.getElementById("imageFallback");

const favoritesList = document.getElementById("favoritesList");
const historyList = document.getElementById("historyList");
const favoritesEmpty = document.getElementById("favoritesEmpty");
const historyEmpty = document.getElementById("historyEmpty");

const STORAGE_KEYS = {
  favorites: "ewc_favorites_v1",
  history: "ewc_history_v1"
};

const fallbackDictionary = {
  dom: { translation: "house", easy: "This is my house.", description: "A house is a building where people live.", synonym: "home" },
  skola: { translation: "school", easy: "I go to school every morning.", description: "A school is a place where people learn.", synonym: "academy" },
  voda: { translation: "water", easy: "I drink water every day.", description: "Water is a clear liquid that people need to live.", synonym: "aqua" },
  kniha: { translation: "book", easy: "I read a book at night.", description: "A book is a set of written pages.", synonym: "volume" },
  priatel: { translation: "friend", easy: "My friend is very kind.", description: "A friend is a person you trust and like.", synonym: "companion" }
};

const reverseFallback = Object.entries(fallbackDictionary).reduce((acc, [sk, value]) => {
  acc[value.translation] = {
    translation: sk,
    easy: value.easy,
    description: value.description,
    synonym: value.synonym
  };
  return acc;
}, {});

let favorites = readStoredArray(STORAGE_KEYS.favorites);
let history = readStoredArray(STORAGE_KEYS.history);
let currentResult = null;

function readStoredArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredArray(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function normalizeSlovakWord(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeEnglishWord(value) {
  return value.trim().toLowerCase().replace(/[^a-z'-]/g, "");
}

function sanitizeTranslation(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
}

function makeEasySentence(word, partOfSpeech, example) {
  if (example && example.length <= 120) {
    return example;
  }

  switch (partOfSpeech) {
    case "noun":
      return `This is a ${word}.`;
    case "verb":
      return `I ${word} every day.`;
    case "adjective":
      return `This is very ${word}.`;
    case "adverb":
      return `She speaks ${word}.`;
    default:
      return `I am learning the word "${word}".`;
  }
}

function makeDescriptionSentence(word, definition) {
  if (definition) {
    return `${capitalize(word)} means ${definition}`;
  }
  return `${capitalize(word)} is an English word used in everyday communication.`;
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function directionPair(direction) {
  return direction === "en-sk"
    ? { source: "en", target: "sk" }
    : { source: "sk", target: "en" };
}

function getEnglishBaseWord(direction, sourceWord, translatedWord) {
  if (direction === "en-sk") {
    return normalizeEnglishWord(sourceWord).split(" ")[0] || normalizeEnglishWord(sourceWord);
  }
  return normalizeEnglishWord(translatedWord).split(" ")[0] || normalizeEnglishWord(translatedWord);
}

async function fetchTranslation(sourceWord, direction) {
  const langs = directionPair(direction);
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sourceWord)}&langpair=${langs.source}|${langs.target}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Translation service is unavailable.");
  }

  const payload = await response.json();
  const rawTranslated = payload?.responseData?.translatedText || "";
  const rawMatch = payload?.matches?.find((entry) => entry.translation)?.translation || "";
  const picked = sanitizeTranslation(rawMatch || rawTranslated);

  if (!picked || picked === "null") {
    throw new Error("No translation found.");
  }

  return picked;
}

async function fetchWordDetails(englishWord) {
  if (!englishWord) {
    return {};
  }

  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(englishWord)}`);

  if (!response.ok) {
    return {};
  }

  const payload = await response.json();
  const firstEntry = payload?.[0];
  const firstMeaning = firstEntry?.meanings?.[0];
  const firstDefinition = firstMeaning?.definitions?.[0];

  return {
    partOfSpeech: firstMeaning?.partOfSpeech || "",
    definition: firstDefinition?.definition ? `${firstDefinition.definition}.` : "",
    example: firstDefinition?.example || "",
    synonyms: firstDefinition?.synonyms || firstMeaning?.synonyms || firstEntry?.synonyms || []
  };
}

async function fetchSynonym(englishWord) {
  if (!englishWord) {
    return "";
  }

  const response = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(englishWord)}&max=5`);

  if (!response.ok) {
    return "";
  }

  const payload = await response.json();
  const found = payload?.find((item) => item.word && item.word !== englishWord);
  return found?.word || "";
}

async function fetchImageForWord(englishWord) {
  if (!englishWord) {
    return { imageUrl: "", imageTitle: "" };
  }

  const query = encodeURIComponent(englishWord);
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=800&generator=search&gsrsearch=${query}&gsrlimit=1`;
  const response = await fetch(url);

  if (!response.ok) {
    return { imageUrl: "", imageTitle: "" };
  }

  const payload = await response.json();
  const pages = payload?.query?.pages ? Object.values(payload.query.pages) : [];
  const page = pages[0];
  const imageUrl = page?.thumbnail?.source || "";
  const imageTitle = page?.title || "";

  return { imageUrl, imageTitle };
}

function setLoadingState(isLoading) {
  button.disabled = isLoading;
  button.textContent = isLoading ? "Generujem..." : "Generovat";
}

function showResult(data) {
  translationText.textContent = data.translation;
  easySentenceText.textContent = data.easySentence;
  descriptionText.textContent = data.description;
  synonymText.textContent = data.synonym;
  if (data.imageUrl) {
    wordImage.src = data.imageUrl;
    wordImage.alt = data.imageTitle ? `Obrazok: ${data.imageTitle}` : `Obrazok slova ${data.imageWord}`;
    wordImage.classList.remove("hidden");
    imageFallback.classList.add("hidden");
  } else {
    wordImage.removeAttribute("src");
    wordImage.classList.add("hidden");
    imageFallback.textContent = "Pre toto slovo sa nenasiel vhodny obrazok.";
    imageFallback.classList.remove("hidden");
  }
  result.classList.remove("hidden");
  resultActions.classList.remove("hidden");
}

function renderList(target, emptyEl, items) {
  target.innerHTML = "";

  if (!items.length) {
    emptyEl.classList.remove("hidden");
    return;
  }

  emptyEl.classList.add("hidden");

  for (const item of items) {
    const row = document.createElement("li");
    row.className = "memory-item";

    const title = document.createElement("strong");
    title.textContent = `${item.sourceWord} -> ${item.translation}`;

    const meta = document.createElement("p");
    meta.className = "memory-meta";
    meta.textContent = `${item.directionLabel} | ${item.synonym}`;

    row.appendChild(title);
    row.appendChild(meta);
    target.appendChild(row);
  }
}

function renderMemory() {
  renderList(favoritesList, favoritesEmpty, favorites);
  renderList(historyList, historyEmpty, history);
}

function rememberHistory(entry) {
  history = [entry, ...history.filter((item) => item.id !== entry.id)].slice(0, 20);
  writeStoredArray(STORAGE_KEYS.history, history);
  renderMemory();
}

function saveFavorite() {
  if (!currentResult) {
    return;
  }

  const exists = favorites.some((item) => item.id === currentResult.id);
  if (exists) {
    statusText.textContent = "Toto slovicko uz mas v oblubenych.";
    return;
  }

  favorites = [currentResult, ...favorites].slice(0, 30);
  writeStoredArray(STORAGE_KEYS.favorites, favorites);
  renderMemory();
  statusText.textContent = "Slovicko bolo ulozene do oblubenych.";
}

function clearHistory() {
  history = [];
  writeStoredArray(STORAGE_KEYS.history, history);
  renderMemory();
  statusText.textContent = "Historia bola vymazana.";
}

function directionLabel(direction) {
  return direction === "en-sk" ? "EN -> SK" : "SK -> EN";
}

function buildResultPayload(direction, sourceWord, translation, easySentence, description, synonym, imageWord, imageUrl, imageTitle) {
  const cleanSource = sourceWord.trim().toLowerCase();
  const cleanTranslation = translation.trim().toLowerCase();

  return {
    id: `${direction}:${cleanSource}:${cleanTranslation}`,
    direction,
    directionLabel: directionLabel(direction),
    sourceWord: cleanSource,
    translation,
    easySentence,
    description,
    synonym,
    imageWord,
    imageUrl,
    imageTitle
  };
}

function updateDirectionUI() {
  const direction = directionSelect.value;

  if (direction === "en-sk") {
    sourceLabel.textContent = "Anglicke slovo";
    input.placeholder = "napr. house";
    translationHeading.textContent = "Preklad (slovensky)";
  } else {
    sourceLabel.textContent = "Slovenske slovo";
    input.placeholder = "napr. dom";
    translationHeading.textContent = "Preklad (english)";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const originalWord = input.value.trim();
  const direction = directionSelect.value;

  if (!originalWord) {
    return;
  }

  setLoadingState(true);
  statusText.textContent = "Spracovavam tvoje slovicko...";

  try {
    let data;

    if (direction === "sk-en") {
      const normalizedSk = normalizeSlovakWord(originalWord);
      const local = fallbackDictionary[normalizedSk];
      if (local) {
        const imageData = await fetchImageForWord(local.translation);
        data = buildResultPayload(
          direction,
          originalWord,
          local.translation,
          local.easy,
          local.description,
          local.synonym,
          local.translation,
          imageData.imageUrl,
          imageData.imageTitle
        );
      }
    } else {
      const normalizedEn = normalizeEnglishWord(originalWord);
      const localReverse = reverseFallback[normalizedEn];
      if (localReverse) {
        const imageData = await fetchImageForWord(normalizedEn);
        data = buildResultPayload(
          direction,
          originalWord,
          localReverse.translation,
          localReverse.easy,
          localReverse.description,
          localReverse.synonym,
          normalizedEn,
          imageData.imageUrl,
          imageData.imageTitle
        );
      }
    }

    if (!data) {
      const translatedWord = await fetchTranslation(originalWord, direction);
      const englishBaseWord = getEnglishBaseWord(direction, originalWord, translatedWord);
      const [details, apiSynonym, imageData] = await Promise.all([
        fetchWordDetails(englishBaseWord),
        fetchSynonym(englishBaseWord),
        fetchImageForWord(englishBaseWord)
      ]);

      const easySentence = makeEasySentence(englishBaseWord, details.partOfSpeech, details.example);
      const description = makeDescriptionSentence(englishBaseWord, details.definition);
      const synonym = apiSynonym || details.synonyms?.[0] || `similar to ${englishBaseWord}`;

      data = buildResultPayload(
        direction,
        originalWord,
        translatedWord,
        easySentence,
        description,
        synonym,
        englishBaseWord,
        imageData.imageUrl,
        imageData.imageTitle
      );
      statusText.textContent = "Hotovo. Vysledok bol vygenerovany z online slovnikov.";
    } else {
      statusText.textContent = "Hotovo. Pouzity lokalny slovnik pre stabilny vysledok.";
    }

    currentResult = data;
    showResult(currentResult);
    rememberHistory(currentResult);
  } catch (error) {
    statusText.textContent = "Nepodarilo sa nacitat online data. Skus ine slovo alebo pouzi zakladne slova (dom, skola, voda, book, friend).";
    result.classList.add("hidden");
    resultActions.classList.add("hidden");
  } finally {
    setLoadingState(false);
  }
});

directionSelect.addEventListener("change", updateDirectionUI);
saveFavoriteBtn.addEventListener("click", saveFavorite);
clearHistoryBtn.addEventListener("click", clearHistory);

updateDirectionUI();
renderMemory();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Silent fail keeps the app usable even when SW registration is blocked.
    });
  });
}
