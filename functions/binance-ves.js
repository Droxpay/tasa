export async function handler(event, context) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Método no permitido" };
  }

  try {
    const body = {
      asset: "USDT",
      fiat: "VES",
      tradeType: "BUY",
      page: 1,
      rows: 20,
      payTypes: ["PagoMovil"] // MÉTODO REAL DETECTADO
    };

    const resp = await fetch(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      return { statusCode: resp.status, body: "Error al obtener datos de Binance" };
    }

    const data = await resp.json();

    const ofertas = (data.data || [])
      .map(o => ({
        price: parseFloat(o.adv.price),
        min: parseFloat(o.adv.minSingleTransQuantity),
        max: parseFloat(o.adv.maxSingleTransQuantity),
      }))
      .filter(o => o.max >= 15 && o.min <= 100)
      .sort((a, b) => a.price - b.price);

    // vendedor 3 → o si no existe, el 2 → si no, el 1
    const vendedor = ofertas[2] ?? ofertas[1] ?? ofertas[0];

    if (!vendedor) {
      return { statusCode: 404, body: "Sin ofertas disponibles" };
    }

    const precioFinal = vendedor.price + 2;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
      body: precioFinal.toFixed(2)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: "Error interno: " + err.message,
    };
  }
}
