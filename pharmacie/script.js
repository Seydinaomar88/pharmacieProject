document.addEventListener("DOMContentLoaded", () => afficherPharmacies());

const form = document.getElementById("pharmacyForm");
let pharmacies = JSON.parse(localStorage.getItem("pharmacies")) || [];

// --- Ajouter une pharmacie ---
form.addEventListener("submit", e => {
    e.preventDefault();
    const nom = document.getElementById("pharmacyName").value.trim();
    const quartier = document.getElementById("pharmacyZone").value.trim();
    if(!nom || !quartier){ alert("Veuillez remplir tous les champs !"); return; }

    pharmacies.push({ nom, quartier, stock: [] });
    localStorage.setItem("pharmacies", JSON.stringify(pharmacies));
    form.reset();
    afficherPharmacies();
});

// --- Afficher pharmacies avec tableau du stock ---
function afficherPharmacies() {
    pharmacies = JSON.parse(localStorage.getItem("pharmacies")) || [];
    const listDiv = document.getElementById("pharmacyList");
    listDiv.innerHTML = "";

    if(pharmacies.length === 0){ listDiv.innerHTML="<p>Aucune pharmacie.</p>"; return; }

    pharmacies.forEach((ph, index)=>{
        const card = document.createElement("div");
        card.className = "pharmacy-card";
        card.innerHTML = `
            <h3>${ph.nom}</h3>
            <p><strong>Quartier :</strong> ${ph.quartier}</p>
            ${ph.stock.length > 0 ? `
                <table border="1" style="width:100%; border-collapse: collapse; margin-bottom:10px;">
                    <thead>
                        <tr>
                            <th>Nom du médicament</th>
                            <th>Quantité</th>
                            <th>Prix (FCFA)</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ph.stock.map((m,i)=>`
                            <tr>
                                <td>${m.nom}</td>
                                <td>${m.qte}</td>
                                <td>${m.prix}</td>
                                <td>
                                    <button onclick="modifierMedicament(${index}, ${i})">✏️</button>
                                    <button onclick="supprimerMedicament(${index}, ${i})">❌</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `<p>Aucun médicament</p>`}
            <button onclick="ajouterMedicament(${index})">💊 Ajouter un médicament</button>
            <button onclick="supprimerPharmacie(${index})">❌ Supprimer</button>
        `;
        listDiv.appendChild(card);
    });
}

// --- Ajouter médicament directement via prompt ---
function ajouterMedicament(phIndex){
    const nom = prompt("Nom du médicament :");
    const qte = prompt("Quantité :");
    const prix = prompt("Prix (FCFA) :");

    if(nom && qte && prix){
        pharmacies[phIndex].stock.push({ nom, qte: parseInt(qte), prix: parseInt(prix) });
        localStorage.setItem("pharmacies", JSON.stringify(pharmacies));
        afficherPharmacies();
    }
}

// --- Modifier médicament ---
function modifierMedicament(phIndex, medIndex){
    const med = pharmacies[phIndex].stock[medIndex];
    const nom = prompt("Nom :", med.nom);
    const qte = prompt("Quantité :", med.qte);
    const prix = prompt("Prix (FCFA) :", med.prix);

    if(nom && qte && prix){
        pharmacies[phIndex].stock[medIndex] = { nom, qte: parseInt(qte), prix: parseInt(prix) };
        localStorage.setItem("pharmacies", JSON.stringify(pharmacies));
        afficherPharmacies();
    }
}

// --- Supprimer médicament ---
function supprimerMedicament(phIndex, medIndex){
    if(confirm("Supprimer ce médicament ?")){
        pharmacies[phIndex].stock.splice(medIndex,1);
        localStorage.setItem("pharmacies", JSON.stringify(pharmacies));
        afficherPharmacies();
    }
}

// --- Supprimer pharmacie ---
function supprimerPharmacie(index){
    if(confirm("Supprimer cette pharmacie ?")){
        pharmacies.splice(index,1);
        localStorage.setItem("pharmacies", JSON.stringify(pharmacies));
        afficherPharmacies();
    }
}
