export const MAX_LITERS = 4;


export function getProductName(data, docId) {

    return data.Nome ||
           data.nome ||
           data.name ||
           docId;

}


export function getProductType(data) {

    return data.Tipo ||
           data.tipo ||
           data.Categoria ||
           data.categoria ||
           data.category ||
           "Bevanda";

}


export function getProductIcon(data) {

    return data.Icona ||
           data.icona ||
           data.emoji ||
           data.immagine ||
           "🥤";

}



export function getBottleQuantity(data) {

    const possibleKeys = [
        "Quantita",
        "quantita",
        "Bottiglie",
        "bottiglie",
        "Disponibilita",
        "disponibilita",
        "Stock",
        "stock"
    ];


    for(const key of possibleKeys){

        const value = Number(data[key]);

        if(!Number.isNaN(value)){
            return Math.max(0,value);
        }

    }

    return 0;

}



export function getBottleSize(data){

    const possibleKeys=[
        "LitriUnita",
        "litriUnita",
        "LitroUnita",
        "litroUnita",
        "LitriSingola",
        "litriSingola",
        "SingleLitri",
        "singleLitri"
    ];


    for(const key of possibleKeys){

        const value=Number(data[key]);

        if(!Number.isNaN(value)){

            return Math.max(
                0.33,
                Math.min(2,value)
            );

        }

    }



    const totalLiters =
        Number(
            data.Litri ||
            data.litri ||
            data.Litro ||
            data.litro
        );


    const quantity=getBottleQuantity(data);


    if(!Number.isNaN(totalLiters) && quantity>0){

        return totalLiters / quantity;

    }


    return 0.33;

}



export function getAvailableLiters(data){

    const quantity=getBottleQuantity(data);

    const bottleSize=getBottleSize(data);


    const total =
        quantity * bottleSize;


    return Math.max(
        0,
        Math.min(MAX_LITERS,total)
    );

}



export function getStockPercent(data){

    const liters=getAvailableLiters(data);

    return Math.round(
        (liters/MAX_LITERS)*100
    );

}



export function getStockLabel(percent){

    if(percent>=75)
        return "Scorta ottima";

    if(percent>=50)
        return "Buona disponibilità";

    if(percent>=25)
        return "Scorta media";

    return "Poche unità";

}




export function renderCard(doc){


    const data =
        typeof doc.data==="function"
        ? doc.data()
        : doc.data;



    const productId =
        doc.id ||
        doc.docId;



    const productName =
        getProductName(
            data,
            productId
        );


    const productType =
        getProductType(data);


    const icon =
        getProductIcon(data);


    const percent =
        getStockPercent(data);



    const liters =
        getAvailableLiters(data);


    const quantity =
        getBottleQuantity(data);



    const unitLiters =
        getBottleSize(data);



return `

<article 
class="card"
data-doc-id="${productId}"
data-kind="beverage">

<div class="product-image">
${icon}
</div>


<div class="name">
${productName}
</div>


<div class="type">
${productType}
</div>



<div class="stock">

<div class="stock-label">
Disponibilità in litri
</div>


<div class="bar">

<div class="fill"
style="width:${percent}%">
</div>

</div>


<div class="amount">

${quantity} bottiglie • 
${unitLiters.toFixed(2)} L ciascuna •
${liters.toFixed(2)} L totali •
${getStockLabel(percent)}

</div>


</div>

</article>

`;

}






export function renderSnackCard(doc){


const data =
typeof doc.data==="function"
? doc.data()
:doc.data;



const snackId =
doc.id ||
doc.docId;



const name =
data.Nome ||
data.nome ||
data.name ||
snackId;



const bags =
Number(
data.NumeroBuste ||
data.numeroBuste ||
data.Buste ||
data.buste ||
0
);



const quantity =
Number(
data.QuantitaBusta ||
data.quantitaBusta ||
data.Quantita ||
data.quantita ||
0
);



return `

<article 
class="card snack-card"
data-doc-id="${snackId}"
data-kind="snack">


<div class="product-image">
🥨
</div>


<div class="name">
${name}
</div>


<div class="type">
Snack
</div>


<div class="stock">

<div class="stock-label">
Disponibilità
</div>


<div class="amount">

${bags} buste • 
${quantity} pezzi per busta

</div>


</div>


</article>

`;

}