// funciones/binance-rate.js
export async function handler(event, context) {
  // Solo permitir método GET
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: "Método no permitido",
    };
  }

  try {
    const body = {
      asset: "USDT",
      fiat: "VES",
      tradeType: "BUY",
      page: 1,
      rows: 20,
      payTypes: ["SpecificBank"],
    };

    // Llamar a Binance
    const resp = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      return { statusCode: resp.status, body: "Error al obtener datos de Binance" };
    }

    const data = await resp.json();

    // Filtrar ofertas válidas (al menos 15 USDT)
    const ofertas = (data.data || [])
      .map(o => ({
        price: parseFloat(o.adv.price),
        min: parseFloat(o.adv.minSingleTransQuantity),
        max: parseFloat(o.adv.maxSingleTransQuantity),
      }))
      .filter(o => o.max >= 15 && o.min <= 100)
      .sort((a, b) => a.price - b.price);

    const mejor = ofertas[1] ?? ofertas[2];
    if (!mejor) {
      return { statusCode: 404, body: "Sin ofertas disponibles" };
    }

    // ✅ Sumar 2 VES a la tasa base
    const precioAjustado = mejor.price + 2;

    // Solo devolver el número ajustado
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
      body: precioAjustado.toFixed(2),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain" },
      body: "Error interno: " + err.message,
    };
  }
}
