const form = document.getElementById("wordForm");
const input = document.getElementById("slovakWord");
const button = document.getElementById("generateBtn");
const statusText = document.getElementById("status");
const result = document.getElementById("result");

const translationText = document.getElementById("translationText");
const easySentenceText = document.getElementById("easySentenceText");
const descriptionText = document.getElementById("descriptionText");
const synonymText = document.getElementById("synonymText");

const fallbackDictionary = {
  dom: { translation: "house", easy: "This is my house.", description: "A house is a building where people live.", synonym: "home" },
  skola: { translation: "school", easy: "I go to school every morning.", description: "A school is a place where people learn.", synonym: "academy" },
  voda: { translation: "water", easy: "I drink water every day.", description: "Water is a clear liquid that people need to live.", synonym: "aqua" },
  kniha: { translation: "book", easy: "I read a book at night.", description: "A book is a set of written pages.", synonym: "volume" },
  priatel: { translation: "friend", easy: "My friend is very kind.", description: "A friend is a person you trust and like.", synonym: "companion" }
};

function normalizeSlovakWord(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatWord(value) {
  const clean = (value || "").trim().toLowerCase();
  return clean.replace(/[^a-z'-]/g, "");
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

async function fetchTranslation(slovakWord) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(slovakWord)}&langpair=sk|en`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Translation service is unavailable.");
  }

  const payload = await response.json();
  const rawTranslated = payload?.responseData?.translatedText || "";
  const rawMatch = payload?.matches?.find((entry) => entry.translation)?.translation || "";
  const picked = formatWord(rawMatch || rawTranslated);

  if (!picked || picked === "null") {
    throw new Error("No translation found.");
  }

  return picked;
}

async function fetchWordDetails(englishWord) {
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
  const response = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(englishWord)}&max=5`);

  if (!response.ok) {
    return "";
  }

  const payload = await response.json();
  const found = payload?.find((item) => item.word && item.word !== englishWord);
  return found?.word || "";
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
  result.classList.remove("hidden");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const originalWord = input.value.trim();
  if (!originalWord) {
    return;
  }

  const normalized = normalizeSlovakWord(originalWord);
  setLoadingState(true);
  statusText.textContent = "Spracovavam tvoje slovicko...";

  try {
    const local = fallbackDictionary[normalized];
    if (local) {
      showResult({
        translation: local.translation,
        easySentence: local.easy,
        description: local.description,
        synonym: local.synonym
      });
      statusText.textContent = "Hotovo. Pouzity lokalny slovnik pre stabilny vysledok.";
      return;
    }

    const englishWord = await fetchTranslation(originalWord);
    const [details, apiSynonym] = await Promise.all([
      fetchWordDetails(englishWord),
      fetchSynonym(englishWord)
    ]);

    const easySentence = makeEasySentence(englishWord, details.partOfSpeech, details.example);
    const description = makeDescriptionSentence(englishWord, details.definition);
    const synonym = apiSynonym || details.synonyms?.[0] || `similar to ${englishWord}`;

    showResult({
      translation: englishWord,
      easySentence,
      description,
      synonym
    });

    statusText.textContent = "Hotovo. Vysledok bol vygenerovany z online slovnikov.";
  } catch (error) {
    statusText.textContent = "Nepodarilo sa nacitat online data. Skus ine slovo alebo pouzi slovo z lokalneho slovnika (napr. dom, skola, voda).";
    result.classList.add("hidden");
  } finally {
    setLoadingState(false);
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Silent fail keeps the app usable even when SW registration is blocked.
    });
  });
}
