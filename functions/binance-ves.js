export async function handler(event, context) {

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: "Método no permitido"
    };
  }

  try {

    // ==========================
    // CONFIGURACIÓN
    // ==========================

    const MONTO_USDT = 10;
    const MARGEN_BS = 2;

    // IMPORTANTE:
    // Verificar los códigos exactos en Binance.
    const PAY_TYPES = [
      "BankTransfer",
      "BancodeVenezuela"
    ];

    // ==========================
    // TIMEOUT
    // ==========================

    const fetchConTimeout = async (url, options = {}, timeout = 10000) => {

      const controller = new AbortController();

      const id = setTimeout(() => {
        controller.abort();
      }, timeout);

      try {

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(id);

        return response;

      } catch (err) {

        clearTimeout(id);

        throw err;
      }
    };

    // ==========================
    // PASO 1
    // OBTENER REFERENCIA GENERAL
    // ==========================

    const referenciaResp = await fetchConTimeout(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          asset: "USDT",
          fiat: "VES",
          tradeType: "BUY",
          page: 1,
          rows: 20
        })
      }
    );

    if (!referenciaResp.ok) {
      throw new Error(
        `Error Binance referencia (${referenciaResp.status})`
      );
    }

    const referenciaData = await referenciaResp.json();

    const ofertasMercado = (referenciaData.data || [])
      .map(item => ({
        price: parseFloat(item.adv.price)
      }))
      .filter(item => !isNaN(item.price))
      .sort((a, b) => a.price - b.price);

    const referencia =
      ofertasMercado[2] ??
      ofertasMercado[1] ??
      ofertasMercado[0];

    if (!referencia) {
      throw new Error(
        "No se encontraron ofertas de referencia"
      );
    }

    // ==========================
    // PASO 2
    // CALCULAR 10 USDT EN Bs
    // ==========================

    const montoVES = Math.round(
      referencia.price * MONTO_USDT
    );

    // ==========================
    // PASO 3
    // BUSCAR OFERTAS REALES
    // ==========================

    const resp = await fetchConTimeout(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          asset: "USDT",
          fiat: "VES",
          tradeType: "BUY",
          page: 1,
          rows: 50,
          transAmount: String(montoVES),
          payTypes: PAY_TYPES
        })
      }
    );

    if (!resp.ok) {
      throw new Error(
        `Error Binance búsqueda (${resp.status})`
      );
    }

    const data = await resp.json();

    const ofertas = (data.data || [])
      .map(item => {

        const adv = item.adv;

        return {
          price: parseFloat(adv.price),
          minVES: parseFloat(
            adv.minSingleTransAmount || 0
          ),
          maxVES: parseFloat(
            adv.dynamicMaxSingleTransAmount ||
            adv.maxSingleTransAmount ||
            999999999
          )
        };

      })
      .filter(item => {

        return (
          !isNaN(item.price) &&
          montoVES >= item.minVES &&
          montoVES <= item.maxVES
        );

      })
      .sort((a, b) => a.price - b.price);

    // ==========================
    // PASO 4
    // CUARTO VENDEDOR
    // ==========================

    const vendedor =
      ofertas[3] ??
      ofertas[2] ??
      ofertas[1] ??
      ofertas[0];

    if (!vendedor) {
      return {
        statusCode: 404,
        body: "No se encontraron ofertas compatibles"
      };
    }

    // ==========================
    // PASO 5
    // SUMAR MARGEN
    // ==========================

    const precioFinal =
      vendedor.price + MARGEN_BS;

    return {

      statusCode: 200,

      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*"
      },

      body: precioFinal.toFixed(2)

    };

  } catch (error) {

    console.error(error);

    return {

      statusCode: 500,

      body: `Error interno: ${error.message}`

    };
  }
}
