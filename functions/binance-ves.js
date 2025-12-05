// funciones/binance-rate.js
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
      payTypes: ["PagoMovil"]
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
      .filter(o => o.max >= 15 && o.min <= 100)   // puedes ajustar este rango
      .sort((a, b) => a.price - b.price);

    // --- toma 3ro; si no existe, 2do; si no existe, 1ro ---
    const vendedor = ofertas[2] ?? ofertas[1] ?? ofertas[0];

    if (!vendedor) {
      return { statusCode: 404, body: "Sin ofertas disponibles" };
    }

    // --- suma +2 puntos a la tasa ---
    const precioFinal = vendedor.price + 2;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
      body: precioFinal.toFixed(2),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: "Error interno: " + err.message,
    };
  }
}
// funciones/binance-rate.js
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
      payTypes: ["BankTransfer"]   // AHORA: solo Transferencia Bancaria
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

    // FILTRO CORRECTO EN USDT (no VES)
    const ofertas = (data.data || [])
      .map(o => ({
        price: parseFloat(o.adv.price),
        min: parseFloat(o.adv.minSingleTransAmount),   // USDT mínimo
        max: parseFloat(o.adv.maxSingleTransAmount),   // USDT máximo
      }))
      .filter(o => o.max >= 15 && o.min <= 100)         // Filtro USDT 15–100
      .sort((a, b) => a.price - b.price);               // Ordenar menor precio primero

    // SELECCIÓN DEL VENDEDOR: 3 → 2 → 1
    const vendedor = ofertas[2] ?? ofertas[1] ?? ofertas[0];

    if (!vendedor) {
      return { statusCode: 404, body: "Sin ofertas disponibles" };
    }

    // SUMAR +3 PUNTOS A LA TASA OBTENIDA
    const precioFinal = vendedor.price + 3;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
      body: precioFinal.toFixed(2),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: "Error interno: " + err.message,
    };
  }
}
