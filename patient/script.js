// --- Normalisation du texte ---
function normalizeText(text){
    return text.toLowerCase()
               .normalize("NFD")
               .replace(/[\u0300-\u036f]/g,"")
               .trim();
}

// --- Gestion des boutons radio (upload / manuel) ---
document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener("change", function() {
        document.getElementById("uploadSection").style.display = this.value === "upload" ? "block" : "none";
        document.getElementById("manuelSection").style.display = this.value === "manuel" ? "block" : "none";
    });
});

// --- Lecture des pharmacies depuis localStorage ---
function getPharmacies() {
    return JSON.parse(localStorage.getItem("pharmacies")) || [];
}

// --- Recherche manuelle ---
function filtrerPharmaciesManuel(){
    const medicamentsText = document.getElementById("medicamentsInput").value;
    if(!medicamentsText.trim()){ 
        alert("⚠️ Veuillez écrire au moins un médicament !");
        return;
    }

    const medsDetected = medicamentsText.split(/[\n,]/)
        .map(s => normalizeText(s))
        .filter(s => s.length > 0);

    afficherPharmacies(medsDetected);
}

// --- OCR avec Tesseract ---
function analyserOrdonnance(){
    const fileInput = document.getElementById("ordonnanceInput");
    if(fileInput.files.length === 0){
        alert("⚠️ Sélectionnez une image d'ordonnance !");
        return;
    }

    const file = fileInput.files[0];
    document.getElementById("medicamentsDetected").innerHTML = "<p>🔍 Analyse en cours...</p>";

    Tesseract.recognize(file, 'fra', { logger: m => console.log(m) })
        .then(({ data:{ text } }) => {
            let medsDetected = text.split(/[\n,]/)
                                   .map(s => normalizeText(s))
                                   .filter(s => s.length > 2);
            document.getElementById("medicamentsDetected").innerHTML =
                `<p><strong>Médicaments détectés :</strong> ${medsDetected.join(", ")}</p>`;
            afficherPharmacies(medsDetected);
        })
        .catch(err => {
            document.getElementById("medicamentsDetected").innerHTML = "<p>❌ Erreur lors de l'analyse.</p>";
            console.error(err);
        });
}

// --- Afficher pharmacies côté patient avec filtrage par ordonnance ---
function afficherPharmacies(medsDetected = []){
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "";

    const pharmacies = getPharmacies();

    pharmacies.forEach((ph, index) => {
        // filtrer seulement les médicaments disponibles
        const medsInPharmacy = medsDetected.length === 0 ? [] :
            medsDetected
                .map(medNom => ph.stock.find(s => normalizeText(s.nom) === medNom))
                .filter(Boolean); // enlever undefined

        if(medsDetected.length === 0 || medsInPharmacy.length > 0){
            const badgeType = medsDetected.length > 0 && medsInPharmacy.length === medsDetected.length ? "all" : "partial";

            const card = document.createElement("div");
            card.className = "pharmacie-card show";

            // Médicaments affichés avec prix
            const medsListHTML = medsInPharmacy.length > 0 ? 
                medsInPharmacy.map(m => `${m.nom} (${m.prix} FCFA)`).join(", ")
                : "Aucun médicament correspondant";

            card.innerHTML = `
                <h4>${ph.nom}</h4>
                <p><strong>Quartier :</strong> ${ph.quartier}</p>
                <p><strong>Médicaments :</strong> ${medsListHTML}</p>
                ${medsInPharmacy.length > 0 ? `<span class="badge ${badgeType}">${badgeType === "all" ? "Tous disponibles" : "Partiel"}</span>` : ""}
                ${medsInPharmacy.length > 0 ? `<button class="orderBtn">Commander</button>` : ""}
            `;
            resultDiv.appendChild(card);

            if(medsInPharmacy.length > 0){
                card.querySelector(".orderBtn").addEventListener("click", () => {
                    passerCommande(index, medsInPharmacy.map(m=>m.nom));
                });
            }
        }
    });

    if(resultDiv.innerHTML.trim() === ""){
        resultDiv.innerHTML = "<p style='text-align:center;'>❌ Aucune pharmacie ne possède ces médicaments.</p>";
    }
}

// --- Passer une commande et décrémenter le stock ---
function passerCommande(phIndex, medsSelected){
    const pharmacies = getPharmacies();
    const ph = pharmacies[phIndex];
    const medicaments = [];

    medsSelected.forEach(medNom=>{
        const med = ph.stock.find(s => normalizeText(s.nom) === normalizeText(medNom));
        if(med && med.qte > 0){
            med.qte--; // décrémenter le stock
            medicaments.push({ nom: med.nom, prix: med.prix });
        }
    });

    localStorage.setItem("pharmacies", JSON.stringify(pharmacies));

    if(medicaments.length === 0){
        alert("⚠️ Aucun médicament disponible dans le stock !");
        return;
    }

    let commandes = JSON.parse(localStorage.getItem("commandes")) || [];
    commandes.push({
        pharmacie: ph.nom,
        quartier: ph.quartier,
        medicaments,
        date: new Date().toLocaleString()
    });
    localStorage.setItem("commandes", JSON.stringify(commandes));

    const total = medicaments.reduce((sum,m)=>sum+m.prix,0);
    alert(`✅ Commande validée ! Total : ${total} FCFA`);

    afficherPharmacies(medsSelected);
}

// --- Historique des commandes avec total ---
function afficherCommandes(dateFilter = ""){
    const commandes = JSON.parse(localStorage.getItem("commandes")) || [];
    const commandesDiv = document.getElementById("commandes");
    commandesDiv.innerHTML = "";

    let filtered = commandes;
    if(dateFilter){
        filtered = commandes.filter(c => c.date.startsWith(dateFilter));
    }

    if(filtered.length === 0){
        commandesDiv.innerHTML = "<p>Aucune commande enregistrée.</p>";
        return;
    }

    filtered.forEach(cmd => {
        const total = cmd.medicaments.reduce((sum,m)=>sum+m.prix,0);
        const div = document.createElement("div");
        div.className = "commande-card";
        div.innerHTML = `
            <p><strong>Pharmacie :</strong> ${cmd.pharmacie} (${cmd.quartier})</p>
            <p><strong>Médicaments :</strong> ${cmd.medicaments.map(m=>`${m.nom} (${m.prix} FCFA)`).join(", ")}</p>
            <p><strong>Total :</strong> ${total} FCFA</p>
            <p><strong>Date :</strong> ${cmd.date}</p><hr>
        `;
        commandesDiv.appendChild(div);
    });
}

// --- Recherche commandes par date ---
function rechercherCommandesParDate(){
    const dateInput = prompt("Entrez la date (ex: 03/11/2025) :");
    if(!dateInput) return;
    afficherCommandes(dateInput);
}

// --- Supprimer commandes par date ---
function supprimerCommandesParDate(){
    const dateInput = prompt("Entrez la date à supprimer (ex: 03/11/2025) :");
    if(!dateInput) return;

    let commandes = JSON.parse(localStorage.getItem("commandes")) || [];
    const avant = commandes.length;
    commandes = commandes.filter(c => !c.date.startsWith(dateInput));
    const apres = commandes.length;

    if(avant === apres){
        alert("⚠️ Aucune commande trouvée pour cette date.");
    } else {
        localStorage.setItem("commandes", JSON.stringify(commandes));
        alert(`✅ ${avant-apres} commande(s) supprimée(s) pour la date ${dateInput}`);
        afficherCommandes(); // Rafraîchir la liste
    }
}
