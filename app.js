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
// =======================================================
// FIREBASE CONFIGURATION
// *** DİKKAT: firebaseConfig'i kendi anahtarlarınızla değiştirmelisiniz! ***
// =======================================================

// Firebase Başlatma
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth(); 

// =======================================================
// DOM ELEMENTLERİ
// =======================================================
const usernameInput = document.getElementById("username-input");
const loginBtn = document.getElementById("login-btn");
const googleLoginBtn = document.getElementById("google-login-btn"); 

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

// =======================================================
// GİRİŞ MANTIĞI
// =======================================================

function handleLogin(username) {
    // Firebase key'leri için geçersiz karakterleri temizle
    const cleanUsername = username.replace(/[.#$[\]]/g, "");
    
    currentUser = cleanUsername;
    localStorage.setItem("currentUser", currentUser);
    
    // UI Güncelleme
    userSection.classList.add("hidden");
    wordInputSection.classList.remove("hidden");
    userFilter.value = "me";
    
    loadUsers();
}

// Google Giriş İşlemi
googleLoginBtn.onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            // Google'daki görünen adı kullan (boşsa e-postanın ilk kısmını kullan)
            const googleUsername = result.user.displayName || result.user.email.split('@')[0];
            handleLogin(googleUsername);
        })
        .catch((error) => {
            console.error("Google giriş hatası:", error);
            showModal("Google ile giriş yapılamadı: " + error.message);
        });
};

// Oturum Durumu Kontrolü (Sayfa yüklendiğinde veya yenilendiğinde)
auth.onAuthStateChanged(user => {
    if (user) {
        // Oturum açıksa, kullanıcıyı otomatik olarak giriş yapmış kabul et
        const googleUsername = user.displayName || user.email.split('@')[0];
        handleLogin(googleUsername);
    } else {
        // Oturum kapalıysa, localStorage'daki veriyi temizle ve giriş ekranını göster
        localStorage.removeItem("currentUser");
        userSection.classList.remove("hidden");
        wordInputSection.classList.add("hidden");
    }
});


// =======================================================
// UYGULAMA MANTIĞI
// =======================================================

// Kelime Gönder (Anlam giriş alanını göster)
submitBtn.onclick = () => {
    const word = wordInput.value.trim();
    if (!word) return showModal("Kelime girin.");
    
    // Kelimenin mevcut kullanıcı tarafından zaten eklenip eklenmediğini kontrol et
    database.ref("words").orderByChild("word").equalTo(word).once("value", snapshot => {
        let exists = false;
        snapshot.forEach(child => {
            if (child.val().user === currentUser) exists = true;
        });
        if (exists) {
            showModal(`"${word}" kelimesi zaten sizin tarafınızdan eklenmiş.`);
            meaningContainer.classList.add("hidden");
            wordInput.value = "";
        } else {
            meaningContainer.classList.remove("hidden");
        }
    });
};

// Kelimeyi Kaydet
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
    searchResult.textContent = ""; 
    loadWords();
};

// Filtre ve Sıralama İşleyicileri
userFilter.onchange = () => {
    loadWords();
    // Sadece "me" (benimkiler) seçiliyse arama bölümünü göster
    if (userFilter.value === "me") searchSection.classList.remove("hidden");
    else searchSection.classList.add("hidden");
};

sortFilter.onchange = () => {
    loadWords();
};

// Arama İşlemi
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
            searchResult.innerHTML = `"${term}" bulunamadı. Lütfen anlamını girin:`;
            wordInput.value = term;
            meaningInput.value = ""; 
            meaningContainer.classList.remove("hidden");
        }
    });
};

// Kullanıcıları Yükle (Filtre için)
function loadUsers() {
    database.ref("users").once("value").then(snapshot => {
        const users = snapshot.val() || {};
        // Yeni kullanıcıyı users listesine ekle
        if (!users[currentUser]) database.ref("users/" + currentUser).set(true);
        updateUserFilter(Object.keys(users));
    });
}

// Kullanıcı Filtresi Seçeneklerini Güncelle
function updateUserFilter(users) {
    userFilter.innerHTML = '<option value="all">Tüm Kullanıcılar</option>';
    
    const meOpt = document.createElement("option");
    meOpt.value = "me";
    meOpt.textContent = "Sadece Benimkiler";
    userFilter.appendChild(meOpt);
    
    users.forEach(user => {
        if (user !== currentUser) {
            const opt = document.createElement("option");
            opt.value = user;
            opt.textContent = user;
            userFilter.appendChild(opt);
        }
    });
    
    userFilter.value = currentUser ? "me" : "all";
    loadWords();
}

// Kelimeleri Yükle ve Filtrele/Sırala
function loadWords() {
    loading.classList.remove("hidden"); 
    wordList.innerHTML = '<h2><i class="fas fa-list-alt"></i> Kelime Listesi</h2><div id="loading" class="loading">Yükleniyor...</div>';

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
    wordList.innerHTML = '<h2><i class="fas fa-list-alt"></i> Kelime Listesi</h2>';

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
        wordInfo.innerHTML = `
            <strong>${word.word}</strong>
            <span>${word.meaning}</span>
            <span class="user-badge">${word.user}</span>
        `;
        
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
    if (confirm("Bu kelimeyi kalıcı olarak silmek istediğinizden emin misiniz?")) {
        database.ref("words/" + id).remove();
        loadWords();
    }
}

// Basit Hata/Bilgi Mesajı
function showModal(content) {
    alert(content);
}
