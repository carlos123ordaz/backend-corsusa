// helpers/pricingHelper.js

/**
 * Flujo de cálculo corregido según la hoja "Oferta" del Excel:
 *
 *  Por TIPO:
 *  ┌─────────────┬───────────────────┬─────────────┬────────────┬────────────┐
 *  │ Paso        │ Consolidar        │ DHL         │ Reventa    │ Servicio   │
 *  ├─────────────┼───────────────────┼─────────────┼────────────┼────────────┤
 *  │ Compra      │ lista×STF×TF      │ lista×STF×TF│ lista×1    │ lista×STF  │
 *  │ F.Import    │ Factores col F    │ Factores G  │ 1          │ estándar   │
 *  │ CISAC       │ compra×FI×TC      │ compra×FI×TC│ compra×1   │ compra×FI  │
 *  │ Cto.Import  │ CISAC−compra      │ CISAC−compra│ 0          │ 0          │
 *  │ F.Margen    │ Factores col H    │ Factores I  │ fijo 1.5   │ fijo 1.0   │
 *  │ P.Final     │ PV×(1−d%)+fijos   │ PV×(1−d%)+f │ PV×(1−d%)+f│ PV×(1−d%)+f│
 *  │ Margen      │ Final−CISAC−Fijos │ idem        │ idem       │ idem       │
 *  │ En totales  │ SÍ                │ SÍ          │ NO compra  │ NO compra  │
 *  └─────────────┴───────────────────┴─────────────┴────────────┴────────────┘
 *
 *  TC = conversión moneda EUR→USD (solo Consolidar y DHL cuando moneda es EUR)
 *
 *  Excepción Endress (Excel col J):
 *    IF(AND(marca="101. EH Endress", moneda="US$", cliente<>"Nexa"), compra × $DR$352)
 *    $DR$352 = 1.35/1.2 = 1.125
 */

const round = (value, decimals = 2) => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
};

const sumFixedCosts = (fc = {}) => {
    const customTotal = (fc.custom_costs || []).reduce((sum, c) => sum + (c.value || 0), 0);
    return (
        customTotal +
        (fc.quality_dossier || 0) +
        (fc.guarantee_letter || 0) +
        (fc.factoring_90d || 0) +
        (fc.applications || 0) +
        (fc.projects || 0) +
        (fc.hseq || 0)
    );
};

/**
 * Factor Endress: $DR$352 = 1.25 / 1.2
 * Excel col J: IF(AND(A="101. EH Endress", E="US$"), F×I×H×$DR$352, F×I×H)
 */
const ENDRESS_FACTOR = 1.25 / 1.2;
const ENDRESS_BRAND = '101. EH Endress';

/**
 * Recalcula toda la cadena de pricing de un sub-item.
 *
 * @param {Object} subItem - El sub-item completo (pricing, fixed_costs, quantity, item_type, brand_name, currency)
 * @param {number} [currencyFactor=1] - Factor de conversión EUR→USD
 */
const recalcSubItemPricing = (subItem, currencyFactor = 1) => {
    const p = subItem.pricing || {};
    const fc = subItem.fixed_costs || {};
    const quantity = subItem.quantity || 1;
    const itemType = subItem.item_type || 'Consolidar';
    const brandCode = subItem.brand_code || '';
    const currency = subItem.currency || 'US$';

    const listPrice = p.list_price || 0;
    const discountFactor = p.discount_factor ?? 1;
    const importFactor = p.import_factor ?? 1.25;
    const marginFactor = p.margin_factor ?? 1.52;
    const specialDiscount = p.special_discount || 0;


    const factoryPrice = subItem.factory_price || 0;
    const factory_discount = (factoryPrice > 0 && listPrice > 0)
        ? round(factoryPrice / listPrice, 6)
        : 1;

    const effCF = (itemType === 'Reventa' || itemType === 'Servicio') ? 1 : currencyFactor;

    // 1. Precio de compra unitario — AHORA INCLUYE SFT
    let purchase_price_unit;
    if (itemType === 'Reventa') {
        purchase_price_unit = round(listPrice);
    } else if (brandCode === ENDRESS_BRAND && currency === 'US$') {
        purchase_price_unit = round(listPrice * discountFactor * factory_discount * ENDRESS_FACTOR);
    } else {
        purchase_price_unit = round(listPrice * discountFactor * factory_discount);
    }

    // 2. Sub total FOB
    const sub_total_fob = round(purchase_price_unit * quantity);

    // 3. Costo CISAC = compra × factorImportación [× TC_moneda]
    const cisac_cost_unit = round(purchase_price_unit * importFactor * effCF);
    const cisac_cost_total = round(cisac_cost_unit * quantity);

    // 4. Costo importación (derivado: CISAC − compra × TC)
    //    Reventa/Servicio = 0
    let import_cost_unit = 0;
    let import_cost_total = 0;
    if (itemType !== 'Reventa' && itemType !== 'Servicio') {
        import_cost_unit = round(cisac_cost_unit - purchase_price_unit * effCF);
        import_cost_total = round(import_cost_unit * quantity);
    }

    // 5. Precio de venta = CISAC × factorMargen
    const sale_price_unit = round(cisac_cost_unit * marginFactor);
    const sale_price_total = round(sale_price_unit * quantity);

    // 6. Costos fijos (se suman al precio final, NO al CISAC)
    const fixedCostsPerUnit = sumFixedCosts(fc);
    const fixedCostsTotal = round(fixedCostsPerUnit * quantity);

    // 7. Precio final = venta × (1 − dcto%) + costos_fijos
    const final_price_unit = round(sale_price_unit * (1 - specialDiscount / 100) + fixedCostsPerUnit);
    const final_price_total = round(final_price_unit * quantity);

    // 8. Margen = final − CISAC − costos_fijos
    const margin_total = round(final_price_total - cisac_cost_total - fixedCostsTotal);
    const priceBase = final_price_total - fixedCostsTotal;
    const margin_percentage = priceBase > 0
        ? round((margin_total / priceBase) * 100, 2)
        : 0;

    return {
        list_price: listPrice,
        factory_discount,
        discount_factor: discountFactor,
        purchase_price_unit,
        sub_total_fob,
        import_factor: importFactor,
        import_cost_unit,
        import_cost_total,
        cisac_cost_unit,
        cisac_cost_total,
        margin_factor: marginFactor,
        sale_price_unit,
        sale_price_total,
        special_discount: specialDiscount,
        final_price_unit,
        final_price_total,
        margin_total,
        margin_percentage,
    };
};

/**
 * Calcula el factor de moneda para un sub-item.
 * EUR → aplica eurToUsd. USD/PEN → 1.
 */
const getCurrencyFactor = (subItem, eurToUsd) => {
    if (subItem.currency === 'EUR') return eurToUsd || 1;
    return 1;
};

/**
 * Recalcula los totales globales de una cotización
 */
const recalcQuotationTotals = (sections = []) => {
    let purchase_total_usd = 0;
    let purchase_total_eur = 0;
    let import_cost_total = 0;
    let cisac_cost_total = 0;
    let custom_costs_total = 0;
    let fixed_costs_total = 0;
    let list_price_total = 0;
    let sale_price_total = 0;
    let final_price_total = 0;
    let margin_amount = 0;
    let products = 0;
    let services = 0;
    let spare_parts = 0;

    for (const section of sections) {
        for (const item of (section.items || [])) {
            for (const sub of (item.sub_items || [])) {
                if (sub.validation === 'ALT.') continue;

                const p = sub.pricing || {};
                const fc = sub.fixed_costs || {};
                const qty = sub.quantity || 1;
                const itemType = sub.item_type || 'Consolidar';
                const fcPerUnit = sumFixedCosts(fc);
                const fcTotal = round(fcPerUnit * qty);

                // Reventa y Servicio se EXCLUYEN de totales de compra
                if (itemType !== 'Reventa' && itemType !== 'Servicio') {
                    if (sub.currency === 'EUR') {
                        purchase_total_eur += p.sub_total_fob || 0;
                    } else {
                        purchase_total_usd += p.sub_total_fob || 0;
                    }
                }

                import_cost_total += p.import_cost_total || 0;
                cisac_cost_total += p.cisac_cost_total || 0;
                custom_costs_total += (fc.custom_costs || []).reduce((s, c) => s + (c.value || 0), 0) * qty;
                fixed_costs_total += fcTotal;

                if (itemType !== 'Reventa' && itemType !== 'Servicio') {
                    list_price_total += (p.list_price || 0) * qty;
                }

                sale_price_total += p.sale_price_total || 0;
                final_price_total += p.final_price_total || 0;
                margin_amount += p.margin_total || 0;

                const cat = (sub.category || '').toLowerCase();
                if (itemType === 'Servicio' || cat.includes('servicio') || cat.includes('service')) {
                    services += p.final_price_total || 0;
                } else if (cat.includes('repuesto') || cat.includes('spare')) {
                    spare_parts += p.final_price_total || 0;
                } else {
                    products += p.final_price_total || 0;
                }
            }
        }
    }

    const discount_total = round(sale_price_total - final_price_total + fixed_costs_total);
    const priceBase = final_price_total - fixed_costs_total;
    const margin_percentage = priceBase > 0
        ? round((margin_amount / priceBase) * 100, 2)
        : 0;

    return {
        purchase_total_usd: round(purchase_total_usd),
        purchase_total_eur: round(purchase_total_eur),
        import_cost_total: round(import_cost_total),
        cisac_cost_total: round(cisac_cost_total),
        custom_costs_total: round(custom_costs_total),
        fixed_costs_total: round(fixed_costs_total),
        list_price_total: round(list_price_total),
        discount_total: round(discount_total),
        final_price_total: round(final_price_total),
        margin_percentage,
        margin_amount: round(margin_amount),
        breakdown: {
            products: round(products),
            services: round(services),
            spare_parts: round(spare_parts),
        },
    };
};

/**
 * Recalcula TODOS los sub-items y totales de una cotización.
 * Usa exchange_rates.eur_to_usd para el factor de conversión.
 */
const recalcFullQuotation = (quotation) => {
    if (!quotation.sections) return quotation;

    const eurToUsd = quotation.exchange_rates?.eur_to_usd || 1;

    for (const section of quotation.sections) {
        for (const item of (section.items || [])) {
            for (const sub of (item.sub_items || [])) {
                const cf = getCurrencyFactor(sub, eurToUsd);
                sub.pricing = recalcSubItemPricing(sub, cf);
            }
        }
    }

    quotation.totals = recalcQuotationTotals(quotation.sections);
    return quotation;
};

module.exports = {
    recalcSubItemPricing,
    recalcQuotationTotals,
    recalcFullQuotation,
    getCurrencyFactor,
    sumFixedCosts,
    round,
};