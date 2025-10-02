// Firebase başlat
const firebaseConfig = {
            apiKey: "AIzaSyAlQR7p6gwbYlRmIVTVXDjvhi79Ms_vcvM",
            authDomain: "words-2a5f2.firebaseapp.com",
            databaseURL: "https://words-2a5f2-default-rtdb.firebaseio.com",
            projectId: "words-2a5f2",
            storageBucket: "words-2a5f2.firebasestorage.app",
            messagingSenderId: "469414272332",
            appId: "1:469414272332:web:4441813c6188a41a20c3e9"
};
// Firebase Başlatma
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM Elementleri
const usernameInput = document.getElementById("username-input");
const loginBtn = document.getElementById("login-btn");
const wordInput = document.getElementById("word-input");
const submitBtn = document.getElementById("submit-word");
const meaningInput = document.getElementById("meaning-input");
const saveBtn = document.getElementById("save-word");
const wordList = document.getElementById("word-list");
const userFilter = document.getElementById("user-filter");
const sortFilter = document.getElementById("sort-filter");
const loading = document.getElementById("loading");
const meaningContainer = document.getElementById("meaning-container");
const wordInputSection = document.getElementById("word-input-section");
const userSection = document.getElementById("user-section");
const searchSection = document.getElementById("search-section");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const searchResult = document.getElementById("search-result");

let currentUser = null;

// Sayfa Yüklendiğinde
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("currentUser");
  if (saved) {
    currentUser = saved;
    userSection.classList.add("hidden");
    wordInputSection.classList.remove("hidden");
    userFilter.value = "me";
    loadUsers();
  }
});

// Giriş Yap Butonu
loginBtn.onclick = () => {
  const username = usernameInput.value.trim();
  if (!username) return showModal("Lütfen kullanıcı adı girin.");
  const clean = username.replace(/[.#$[\]]/g, "");
  if (clean !== username) return showModal("Geçersiz karakter kullandınız.");
  currentUser = clean;
  localStorage.setItem("currentUser", currentUser);
  userSection.classList.add("hidden");
  wordInputSection.classList.remove("hidden");
  userFilter.value = "me";
  loadUsers();
};

// Kelime Gönder Butonu
submitBtn.onclick = () => {
  const word = wordInput.value.trim();
  if (!word) return showModal("Kelime girin.");
  database.ref("words").orderByChild("word").equalTo(word).once("value", snapshot => {
    let exists = false;
    snapshot.forEach(child => {
      // Kelimeyi mevcut kullanıcının ekleyip eklemediğini kontrol et
      if (child.val().user === currentUser) exists = true;
    });
    if (exists) showModal("Bu kelime zaten eklenmiş.");
    else meaningContainer.classList.remove("hidden");
  });
};

// Anlamı Kaydet Butonu
saveBtn.onclick = () => {
  const word = wordInput.value.trim();
  const meaning = meaningInput.value.trim();
  if (!word || !meaning) return showModal("Kelime ve anlam girin.");
  const newWord = {
    word, meaning, user: currentUser,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  database.ref("words").push(newWord);
  wordInput.value = "";
  meaningInput.value = "";
  meaningContainer.classList.add("hidden");
  searchResult.textContent = ""; // Arama sonucunu temizle
  loadWords();
};

// Kullanıcı Filtresi Değiştiğinde
userFilter.onchange = () => {
  loadWords();
  // Sadece "me" seçiliyse arama bölümünü göster
  if (userFilter.value === "me") searchSection.classList.remove("hidden");
  else searchSection.classList.add("hidden");
};

// Sıralama Filtresi Değiştiğinde
sortFilter.onchange = () => {
  loadWords();
};

// Arama Butonu
searchBtn.onclick = () => {
  const term = searchInput.value.trim().toLowerCase();
  if (!term) return;

  // Sadece mevcut kullanıcının kelimeleri arasında arama yap
  database.ref("words").orderByChild("user").equalTo(currentUser).once("value", snapshot => {
    let found = false;
    snapshot.forEach(child => {
      if (child.val().word.toLowerCase() === term) found = true;
    });

    if (found) {
      searchResult.textContent = `"${term}" zaten eklenmiş.`;
      meaningContainer.classList.add("hidden");
      wordInput.value = "";
      meaningInput.value = "";
    } else {
      searchResult.innerHTML = `"${term}" bulunamadı. Anlamını girin:`;
      wordInput.value = term;
      meaningInput.value = ""; 
      meaningContainer.classList.remove("hidden");
    }
  });
};

// Kullanıcıları Yükle
function loadUsers() {
  database.ref("users").once("value").then(snapshot => {
    const users = snapshot.val() || {};
    // Yeni kullanıcıyı listeye ekle
    if (!users[currentUser]) database.ref("users/" + currentUser).set(true);
    updateUserFilter(Object.keys(users));
  });
}

// Kullanıcı Filtresi Seçeneklerini Güncelle
function updateUserFilter(users) {
  userFilter.innerHTML = '<option value="all">Tüm Kullanıcılar</option>';
  
  // "Sadece Benimkiler" seçeneğini her zaman ekle
  const meOpt = document.createElement("option");
  meOpt.value = "me";
  meOpt.textContent = "Sadece Benimkiler";
  userFilter.appendChild(meOpt);
  
  // Diğer kullanıcıları ekle
  users.forEach(user => {
    if (user !== currentUser) {
      const opt = document.createElement("option");
      opt.value = user;
      opt.textContent = user;
      userFilter.appendChild(opt);
    }
  });
  
  // Filtreyi başlangıçta "me" olarak ayarla
  userFilter.value = currentUser ? "me" : "all";
  loadWords();
}

// Kelimeleri Yükle
function loadWords() {
  loading.classList.remove("hidden"); 

  database.ref("words").once("value", snapshot => {
    const words = [];
    snapshot.forEach(child => {
      const word = child.val();
      word.id = child.key;
      words.push(word);
    });

    const selectedUser = userFilter.value;
    
    // 1. Filtreleme
    const filtered = selectedUser === "all" ? words :
      selectedUser === "me" ? words.filter(w => w.user === currentUser) :
      words.filter(w => w.user === selectedUser);

    // 2. Sıralama
    const sortOrder = sortFilter.value; 
      
    switch (sortOrder) {
      case "alphabetical-za":
        filtered.sort((a, b) => b.word.localeCompare(a.word));
        break;
      case "newest":
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case "oldest":
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        break;
      default: // alphabetical-az
        filtered.sort((a, b) => a.word.localeCompare(b.word));
        break;
    }

    displayWords(filtered);
    loading.classList.add("hidden"); 
  });
}

// Kelimeleri Ekrana Yazdır
function displayWords(words) {
  wordList.innerHTML = '<h2>Kelime Listesi</h2>';

  if (!words.length) {
    wordList.innerHTML += "<p>Henüz kelime yok.</p>";
    return;
  }
  words.forEach(word => {
    const item = document.createElement("div");
    item.className = "word-item";
    
    const text = document.createElement("div");
    text.className = "word-text";
    
    const wordInfo = document.createElement("span");
    wordInfo.className = "word-info";
    wordInfo.innerHTML = `<strong>${word.word}</strong>: ${word.meaning} <span class="user-badge">${word.user}</span>`;
    
    text.appendChild(wordInfo);

    // Silme butonu sadece kendi kelimelerimiz için
    if (word.user === currentUser) {
      const btn = document.createElement("button");
      btn.className = "delete-btn";
      btn.innerHTML = '<i class="fas fa-trash"></i>';
      btn.onclick = () => deleteWord(word.id);
      text.appendChild(btn);
    }
    
    item.appendChild(text);
    wordList.appendChild(item);
  });
}

// Kelime Silme
function deleteWord(id) {
  if (confirm("Bu kelime silinsin mi?")) {
    database.ref("words/" + id).remove();
    loadWords();
  }
}

// Basit Hata/Bilgi Mesajı
function showModal(content) {
  // HTML'de modal tanımlı olsa da JS'de sadece alert kullanılıyor.
  alert(content);
}
