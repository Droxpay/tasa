export async function handler(event, context) {

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: "Método no permitido"
    };
  }

  try {

    // ==================================
    // CONFIGURACIÓN
    // ==================================

    const MONTO_USDT = 10;
    const MARGEN_COP = 100;

    const PAY_TYPES = ["Nequi"];

    const BINANCE_URL =
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";

    // ==================================
    // FETCH CON TIMEOUT
    // ==================================

    async function fetchWithTimeout(url, options, timeout = 10000) {

      const controller = new AbortController();

      const timer = setTimeout(() => {
        controller.abort();
      }, timeout);

      try {

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timer);

        return response;

      } catch (error) {

        clearTimeout(timer);

        throw error;
      }
    }

    // ==================================
    // PASO 1
    // OBTENER REFERENCIA DEL MERCADO
    // ==================================

    const referenciaBody = {
      fiat: "COP",
      page: 1,
      rows: 10,
      tradeType: "BUY",
      asset: "USDT",
      countries: [],
      proMerchantAds: false,
      publisherType: null,
      payTypes: PAY_TYPES,
      filterType: "all",
      followed: false,
      tradedWith: false,
      shieldMerchantAds: false,
      periods: [],
      additionalKycVerifyFilter: 0,
      classifies: [
        "mass",
        "profession",
        "fiat_trade"
      ]
    };

    const referenciaResp = await fetchWithTimeout(
      BINANCE_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(referenciaBody)
      }
    );

    if (!referenciaResp.ok) {
      throw new Error(
        `Error Binance referencia (${referenciaResp.status})`
      );
    }

    const referenciaData =
      await referenciaResp.json();

    const ofertasReferencia =
      (referenciaData.data || [])
        .map(item => ({
          price: parseFloat(item.adv.price)
        }))
        .filter(item => !isNaN(item.price))
        .sort((a, b) => a.price - b.price);

    const tercerVendedor =
      ofertasReferencia[2] ??
      ofertasReferencia[1] ??
      ofertasReferencia[0];

    if (!tercerVendedor) {
      throw new Error(
        "No se encontraron ofertas de referencia"
      );
    }

    // ==================================
    // PASO 2
    // CALCULAR 10 USDT EN COP
    // ==================================

    const montoCOP =
      Math.round(
        tercerVendedor.price * MONTO_USDT
      );

    // ==================================
    // PASO 3
    // BUSCAR OFERTAS PARA ESE MONTO
    // ==================================

    const busquedaBody = {
      fiat: "COP",
      page: 1,
      rows: 10,
      tradeType: "BUY",
      asset: "USDT",
      countries: [],
      proMerchantAds: false,
      publisherType: null,
      payTypes: PAY_TYPES,
      transAmount: montoCOP,
      filterType: "all",
      followed: false,
      tradedWith: false,
      shieldMerchantAds: false,
      periods: [],
      additionalKycVerifyFilter: 0,
      classifies: [
        "mass",
        "profession",
        "fiat_trade"
      ]
    };

    const resp = await fetchWithTimeout(
      BINANCE_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(busquedaBody)
      }
    );

    if (!resp.ok) {
      throw new Error(
        `Error Binance búsqueda (${resp.status})`
      );
    }

    const data = await resp.json();

    const ofertas =
      (data.data || [])
        .map(item => ({
          price: parseFloat(item.adv.price)
        }))
        .filter(item => !isNaN(item.price))
        .sort((a, b) => a.price - b.price);

    // ==================================
    // PASO 4
    // CUARTO VENDEDOR
    // ==================================

    const vendedorFinal =
      ofertas[3] ??
      ofertas[2] ??
      ofertas[1] ??
      ofertas[0];

    if (!vendedorFinal) {
      throw new Error(
        "No se encontraron ofertas compatibles"
      );
    }

    // ==================================
    // PASO 5
    // MARGEN
    // ==================================

    const precioFinal =
      vendedorFinal.price + MARGEN_COP;

    // ==================================
    // RESPUESTA
    // ==================================

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*"
      },
      body: precioFinal.toFixed(2)
    };

  } catch (error) {

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/plain"
      },
      body:
        "Error interno: " + error.message
    };
  }
}
