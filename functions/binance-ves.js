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
      rows: 5 // solo primeras 5 ofertas
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

    // Tomar solo las primeras 5 ofertas
    const ofertas = (data.data || []).slice(0, 5).map(o => ({
      price: o.adv.price,
      min: o.adv.minSingleTransQuantity,
      max: o.adv.maxSingleTransQuantity,
      payTypes: o.adv.tradeMethods.map(m => m.payType), // 🔥 aquí salen los métodos reales
      payNames: o.adv.tradeMethods.map(m => m.tradeMethodName) // nombre visible
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(ofertas, null, 2),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: "Error interno: " + err.message,
    };
  }
}
