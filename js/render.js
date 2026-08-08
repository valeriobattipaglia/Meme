export const MAX_LITERS = 4;
export const MAX_SNACK_QTY = 20;

export function getProductName(data, docId) {
  if (!data) return docId || "Senza Nome";
  return data.Nome || data.nome || data.name || docId || "Senza Nome";
}

export function getProductType(data) {
  if (!data) return "Bevanda";
  return data.Tipo || data.tipo || data.Categoria || data.categoria || "Bevanda";
}

export function getProductIcon(data) {
  if (!data) return "🥤";
  return data.Icona || data.icona || data.emoji || data.immagine || "🥤";
}

export function getBottleQuantity(data) {
  if (!data) return 0;
  const possibleKeys = ["Quantita", "quantita", "Bottiglie", "bottiglie", "Disponibilita", "disponibilita", "Pezzi", "pezzi"];
  for (const key of possibleKeys) {
    if (data[key] !== undefined && data[key] !== null) {
      const val = Number(data[key]);
      if (!Number.isNaN(val)) return Math.max(0, val);
    }
  }
  return 0;
}

export function getBottleSize(data) {
  if (!data) return 0.33;
  const possibleKeys = ["LitriUnita", "litriUnita", "LitroUnita", "litroUnita", "LitriSingola", "litriSingola", "SingleLitri", "singleLitri"];
  for (const key of possibleKeys) {
    if (data[key] !== undefined && data[key] !== null) {
      const val = Number(data[key]);
      if (!Number.isNaN(val)) return Math.max(0.05, Math.min(5, val));
    }
  }
  return 0.33;
}

export function getSnackGrams(data) {
  if (!data) return 0;
  const possibleKeys = ["grammiquantita", "GrammiQuantita", "grammiQuantita", "grammi", "Grammi"];
  for (const key of possibleKeys) {
    if (data[key] !== undefined && data[key] !== null) {
      const val = Number(data[key]);
      if (!Number.isNaN(val)) return Math.max(0, val);
    }
  }
  return 0;
}

export function getAvailableLiters(data) {
  const quantity = getBottleQuantity(data);
  const bottleSize = getBottleSize(data);
  const total = quantity * bottleSize;
  return Math.max(0, Math.min(MAX_LITERS, total));
}

export function getfrifgePercent(data, isSnack = false) {
  if (isSnack) {
    const qty = getBottleQuantity(data);
    return Math.min(100, Math.round((qty / MAX_SNACK_QTY) * 100));
  }
  const liters = getAvailableLiters(data);
  return Math.round((liters / MAX_LITERS) * 100);
}

export function getfrifgeLabel(percent) {
  if (percent >= 75) return "Scorta ottima";
  if (percent >= 50) return "Buona disponibilità";
  if (percent >= 25) return "Scorta media";
  return "Poche unità";
}

export function renderCard(doc, forcedCategory = null) {
  if (!doc) return "";
  const data = typeof doc.data === "function" ? doc.data() : (doc.data || {});
  const productId = doc.id || doc.docId || "";

  const productName = getProductName(data, productId);
  const icon = getProductIcon(data);
  const quantity = getBottleQuantity(data);

  // Rileva se è uno snack basandosi sul tipo forzato o dai dati
  const isSnack = forcedCategory === "snack" || 
                  data.grammiquantita !== undefined || 
                  data.GrammiQuantita !== undefined || 
                  String(getProductType(data)).toLowerCase().includes("snack");

  const percent = getfrifgePercent(data, isSnack);
  let productType = getProductType(data);
  let labelText = "Disponibilità in litri";
  let amountDetails = "";
  let kind = "drink";

  if (isSnack) {
    kind = "snack";
    productType = "Snack";
    labelText = "Quantità disponibile";
    const grams = getSnackGrams(data);
    const totalGrams = grams * quantity;

    amountDetails = grams > 0 
      ? `${quantity} pezzi • ${grams}g ciascuno (${totalGrams}g tot)` 
      : `${quantity} pezzi`;
  } else {
    kind = forcedCategory || "drink";
    const unitLiters = getBottleSize(data);
    const liters = getAvailableLiters(data);
    amountDetails = `${quantity} bottiglie • ${unitLiters.toFixed(2)} L ciascuna • ${liters.toFixed(2)} L totali`;
  }

  return `
<article 
  class="card"
  data-doc-id="${productId}"
  data-kind="${kind}">

  <div class="product-image">
    ${icon}
  </div>

  <div class="name">
    ${productName}
  </div>

  <div class="type">
    ${productType}
  </div>

  <div class="frifge">
    <div class="frifge-label">
      ${labelText}
    </div>

    <div class="bar">
      <div class="fill" style="width:${percent}%"></div>
    </div>

    <div class="amount">
      ${amountDetails} • ${getfrifgeLabel(percent)}
    </div>
  </div>
</article>
  `;
}