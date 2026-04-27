
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

// YENİ PROFİL KARTI DOM'LARI
const profileCard = document.getElementById("profile-card");
const profileUsername = document.getElementById("profile-username");
const totalWordsEl = document.getElementById("total-words");
const lastAddedEl = document.getElementById("last-added");
const achievementMessage = document.getElementById("achievement-message");
const trophyText = document.getElementById("trophy-text");

let currentUser = null;

// =======================================================
// GİRİŞ MANTIĞI VE OTURUM KONTROLÜ
// =======================================================

// app.js dosyanızdaki handleLogin fonksiyonu
function handleLogin(username) {
    const cleanUsername = username.replace(/[.#$[\]]/g, "");
    currentUser = cleanUsername; 
    localStorage.setItem("currentUser", currentUser);
    
    const uid = auth.currentUser.uid;
    
    // 1. Google Bayrağını UID ile kaydet (Veritabanındaki ana yetki kaynağımız)
    database.ref("google_uids/" + uid).set(true); 
    
    // 2. Kullanıcı Adını sadece kaydet (Çakışmayı önlemek için burada UID kullanmıyoruz)
    database.ref("users/" + currentUser).set(true); 

    // UI Güncelleme (Geri kalanı aynı kalacak)
    userSection.classList.add("hidden");
    wordInputSection.classList.remove("hidden");
    profileCard.classList.remove("hidden"); 
    profileUsername.textContent = username; 
    userFilter.value = "me";
    
    loadUsers();
}

// Google Giriş İşlemi
googleLoginBtn.onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            const googleUsername = result.user.displayName || result.user.email.split('@')[0];
            handleLogin(googleUsername);
        })
        .catch((error) => {
            console.error("Google giriş hatası:", error);
            showModal("Google ile giriş yapılamadı: " + error.message);
        });
};

// Oturum Durumu Kontrolü (Sayfa yüklendiğinde)
auth.onAuthStateChanged(user => {
    if (user) {
        const googleUsername = user.displayName || user.email.split('@')[0];
        handleLogin(googleUsername);
        checkAndLoadDailyWords(); // Kelimeleri kontrol et ve yükle        
        setupDailyWords();
                
    } else {
        localStorage.removeItem("currentUser");
        userSection.classList.remove("hidden");
        wordInputSection.classList.add("hidden");
        profileCard.classList.add("hidden");
    }
});


// =======================================================
// KELİME EKLEME VE İŞLEME
// =======================================================
async function checkAndLoadDailyWords() {
    const userId = auth.currentUser.uid;
    const today = new Date().toLocaleDateString();

    // 1. Firebase'den kullanıcının bugünkü kelimelerini çekmeyi dene
    const dailySnapshot = await database.ref(`users/${userId}/dailyWords`).once('value');
    const dailyData = dailySnapshot.val();

    // 2. Eğer bugün için zaten kelime seçilmişse, direkt onları ekrana bas
    if (dailyData && dailyData.date === today) {
        console.log("Bugünün kelimeleri zaten seçilmiş, getiriliyor...");
        renderDailyCards(dailyData.words);
    } else {
        // 3. Bugün için veri yoksa (veya eski tarihliyse) yeni 5 tane seç
        console.log("Bugün için yeni kelimeler seçiliyor...");
        setupDailyWords(); // Bu fonksiyon yeni 5 kelime seçip kaydedecek
    }
    
    // Bölümü görünür yap
    document.getElementById("daily-learning-section").classList.remove("hidden");
}

function renderDailyCards(words) {
    const container = document.getElementById("daily-cards-container");
    if (!container) return;
    
    container.innerHTML = ""; // İçeriği temizle

    words.forEach(word => {
        // Güvenli veri okuma
        const wordText = word.word || "Kelime Yok";
        const meaningText = word.meaning || "Anlam Yok";
        const wordId = word.id || Math.random().toString(36).substr(2, 9);

        const card = document.createElement("div");
        card.className = "flashcard";
        card.innerHTML = `
            <div class="flashcard-inner">
                <div class="front"><strong>${wordText}</strong></div>
                <div class="back">
                    <p>${meaningText}</p>
                    <button class="primary-btn learned-btn" onclick="markAsLearned('${wordId}')">Ezberledim!</button>
                </div>
            </div>
        `;

        // Kartın dönme efekti (Fonksiyon içinde olmalı)
        card.addEventListener('click', function(e) {
            if (e.target.tagName !== 'BUTTON') {
                this.classList.toggle('flipped');
            }
        });

        container.appendChild(card);
    });
          }
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
    
    // Veritabanına kaydet
    database.ref("words").push(newWord)
        .then(() => {
            // Kayıt başarılı olduktan sonra ödül kontrolü yap ve listeyi yenile
            wordInput.value = "";
            meaningInput.value = "";
            meaningContainer.classList.add("hidden");
            searchResult.textContent = ""; 
            loadWords(); // Yeni istatistikleri ve listeyi yükle
        });
};


// =======================================================
// FİLTRELEME VE ARAMA
// =======================================================

userFilter.onchange = () => {
    loadWords();
    if (userFilter.value === "me") searchSection.classList.remove("hidden");
    else searchSection.classList.add("hidden");
};

sortFilter.onchange = () => {
    loadWords();
};

searchBtn.onclick = () => {
    const term = searchInput.value.trim().toLowerCase();
    if (!term) return;

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

// =======================================================
// VERİ YÖNETİMİ
// =======================================================

// Kullanıcıları Yükle (Filtre için)
function loadUsers() {
    database.ref("users").once("value").then(snapshot => {
        const users = snapshot.val() || {};
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

// Kelimeleri Yükle, Filtrele, Sırala VE İstatistikleri Hesapla
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

        // İstatistik Hesaplama (Tüm kelimelerden)
        calculateAndDisplayStats(words);

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
async function updateLearningStats() {
    const userId = auth.currentUser.uid;
    
    // 1. Öğrenilen kelimeleri çek
    const learnedSnapshot = await database.ref(`users/${userId}/learnedWords`).once('value');
    const learnedCount = learnedSnapshot.val() ? Object.keys(learnedSnapshot.val()).length : 0;

    // 2. Havuzdaki toplam kelime sayısını çek
    const poolSnapshot = await database.ref("wordPool").once('value');
    const totalPoolCount = poolSnapshot.val() ? Object.keys(poolSnapshot.val()).length : 0;

    // 3. HTML'deki stat alanlarını güncelle (ID'leri index.html'e göre ayarla)
    document.getElementById("total-words").textContent = learnedCount; // Öğrenilen kelime sayısı
    document.getElementById("progress-text").textContent = `Öğrenme Durumu: ${learnedCount} / ${totalPoolCount}`;
    
    const progressPercent = totalPoolCount > 0 ? (learnedCount / totalPoolCount) * 100 : 0;
    document.getElementById("progress-bar").style.width = progressPercent + "%";
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

// =======================================================
// İSTATİSTİK VE OYUNLAŞTIRMA MANTIĞI
// =======================================================

// İstatistikleri Hesaplama ve Kartı Güncelleme
function calculateAndDisplayStats(allWords) {
    // Sadece mevcut kullanıcının kelimeleri
    const userWords = allWords.filter(w => w.user === currentUser);
    const totalCount = userWords.length;

    // 1. İstatistikleri Güncelle
    totalWordsEl.textContent = totalCount;

    // 2. Son Kelime Tarihini Hesapla
    if (userWords.length > 0) {
        userWords.sort((a, b) => b.timestamp - a.timestamp);
        const lastTimestamp = userWords[0].timestamp;
        const date = new Date(lastTimestamp);
        lastAddedEl.textContent = date.toLocaleDateString("tr-TR");
    } else {
        lastAddedEl.textContent = "--";
    }

    // 3. Ödül Kontrolü
    checkAchievement(totalCount);
}

// Ödül Kontrolü ve Mesajı Gösterme
function checkAchievement(totalCount) {
    achievementMessage.classList.add("hidden"); 

    if (totalCount === 0) {
        trophyText.textContent = `Hadi ilk kelimeni ekle!`;
        achievementMessage.classList.remove("hidden");
        return;
    }

    // Her 10 kelimede bir ödül
    const trophyThreshold = 10;
    const currentTrophy = Math.floor(totalCount / trophyThreshold) * trophyThreshold;
    
    if (totalCount > 0 && totalCount % trophyThreshold === 0) {
        // Ödül kazanıldı! (Sadece tam 10, 20, 30... olduğunda göster)
        trophyText.textContent = `TEBRİKLER! ${currentTrophy} kelime eşiğini aştın! 💪`;
        achievementMessage.classList.remove("hidden");
        achievementMessage.style.animation = 'pulse 1.5s infinite';
        
        // Mesajı 5 saniye sonra gizle
        setTimeout(() => {
            achievementMessage.classList.add("hidden");
            achievementMessage.style.animation = 'none';
        }, 5000);
        
    } else {
        // Bir sonraki ödüle ne kadar kaldığını göster
        const nextTrophy = currentTrophy + trophyThreshold;
        const remaining = nextTrophy - totalCount;
        trophyText.textContent = `Bir sonraki ${nextTrophy} kelimeye ${remaining} kaldı!`;
        achievementMessage.classList.remove("hidden");
        achievementMessage.style.animation = 'none';
    }
}
// Seçim Algoritması: Günlük 5 Kelime Belirle
async function setupDailyWords() {
    const userId = auth.currentUser.uid;
    
    // 1. Kullanıcının daha önce öğrendiği kelimeleri al
    const learnedSnapshot = await database.ref(`users/${userId}/learnedWords`).once('value');
    const learnedList = learnedSnapshot.val() ? Object.keys(learnedSnapshot.val()) : [];

    // 2. Tüm kelime havuzunu al
    const poolSnapshot = await database.ref("wordPool").once('value');
    const allWords = [];
    poolSnapshot.forEach(child => {
        if (!learnedList.includes(child.key)) {
            allWords.push({ id: child.key, ...child.val() });
        }
    });

    // 3. Karıştır ve 5 tane seç (Aynı kelime gelme olasılığı böylece sıfırlanır)
    const shuffled = allWords.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    // 4. Firebase'e o günün kelimeleri olarak kaydet
    const dailyData = {
        date: new Date().toLocaleDateString(),
        words: selected
    };
    await database.ref(`users/${userId}/dailyWords`).set(dailyData);
    renderDailyCards(selected);
}

// Kartları Ekrana Bas
function renderDailyCards(words) {
    const container = document.getElementById("daily-cards-container");
    if (!container) return;
    
    container.innerHTML = "";
    console.log("Ekrana basılacak ham veri:", words); // F12 Konsolunda burayı kontrol et

    if (!words || !Array.isArray(words)) {
        container.innerHTML = "<p>Kelimeler yüklenemedi.</p>";
        return;
    }

    words.forEach(item => {
        // Firebase'den gelen veri yapısına göre en güvenli okuma:
        // Eğer 'word' yoksa 'item'ın kendisine bak, o da yoksa varsayılan metin yaz.
        const wordText = item.word || (typeof item === 'string' ? item : "Belirsiz Kelime");
        const meaningText = item.meaning || "Anlam eklenmemiş";
        const wordId = item.id || Math.random().toString(36).substr(2, 9);

        const card = document.createElement("div");
        card.className = "flashcard";
        card.innerHTML = `
            <div class="flashcard-inner">
                <div class="front"><strong>${wordText}</strong></div>
                <div class="back">
                    <p>${meaningText}</p>
                    <button class="primary-btn learned-btn" onclick="markAsLearned('${wordId}')">Ezberledim!</button>
                </div>
            </div>
        `;

        card.addEventListener('click', function(e) {
            if (e.target.tagName !== 'BUTTON') {
                this.classList.toggle('flipped');
            }
        });

        container.appendChild(card);
    });
}

// Ezberledim İşareti
async function markAsLearned(wordId) {
    const userId = auth.currentUser.uid;
    // Firebase'e kaydet
    await database.ref(`users/${userId}/learnedWords/${wordId}`).set(true);
    
    // UI'ı anında güncelle
    alert("Kelime öğrenilenlere eklendi!");
    updateLearningStats(); // İstatistikleri yenile
    setupDailyWords();     // Yeni kartları getir (isteğe bağlı)
}
// Örnek toplu yükleme fonksiyonu
function uploadPool() {
    const words = [
        { word: "Persistent", meaning: "Israrcı" },
        { word: "Ambiguous", meaning: "Belirsiz" },
        // ... listeyi uzat
    ];
    words.forEach(w => database.ref("wordPool").push(w));
}
function topluKelimeYukle() {
    const havuz = [
        { word: "Resilient", meaning: "Dayanıklı, çabuk iyileşen" },
        { word: "Versatile", meaning: "Çok yönlü" },
        { word: "Eloquent", meaning: "Güzel konuşan, hitabeti güçlü" },
        { word: "Candid", meaning: "Samimi, içten" },
        { word: "Meticulous", meaning: "Titiz, dikkatli" }
    ];

    havuz.forEach(kelime => {
        database.ref("wordPool").push(kelime);
    });
    console.log("Kelimeler başarıyla wordPool'a eklendi!");
}

// Tarayıcı konsoluna (F12) 'topluKelimeYukle()' yazarak çalıştırabilirsin.
// Eski (Gizli) Giriş Butonunun İşleyicisi
loginBtn.onclick = () => {
    // Bu buton artık HTML'de gizlidir, sadece yedek olarak durur.
    const username = usernameInput.value.trim();
    if (!username) return showModal("Lütfen kullanıcı adı girin.");
    // Bu yolla giriş yapanlar Realtime DB kurallarına takılabilir.
    currentUser = username.replace(/[.#$[\]]/g, "");
    loadUsers();
};

