// models/Quotation.js
const { Schema, model } = require('mongoose');

// Sub-schemas embebidos
const StaffRoleSchema = Schema({
    staff_id: {
        type: Schema.Types.ObjectId,
        ref: 'Staff'
    },
    code: String,
    name: String,
    role: String
}, { _id: false });

const PricingSchema = Schema({
    list_price: { type: Number, default: 0 },
    factory_discount: { type: Number, default: 1 },
    discount_factor: { type: Number, default: 1 },
    purchase_price_unit: { type: Number, default: 0 },
    sub_total_fob: { type: Number, default: 0 },
    import_factor: { type: Number, default: 1.25 },
    import_cost_unit: { type: Number, default: 0 },
    import_cost_total: { type: Number, default: 0 },
    cisac_cost_unit: { type: Number, default: 0 },
    cisac_cost_total: { type: Number, default: 0 },
    margin_factor: { type: Number, default: 1.52 },
    sale_price_unit: { type: Number, default: 0 },
    sale_price_total: { type: Number, default: 0 },
    special_discount: { type: Number, default: 0 },
    final_price_unit: { type: Number, default: 0 },
    final_price_total: { type: Number, default: 0 },
    margin_total: { type: Number, default: 0 },
    margin_percentage: { type: Number, default: 0 }
}, { _id: false });

const CustomCostSchema = Schema({
    label: { type: String, required: true },
    value: { type: Number, default: 0 }
}, { _id: false });

const FixedCostsSchema = Schema({
    custom_costs: { type: [CustomCostSchema], default: [] },
    quality_dossier: { type: Number, default: 0 },
    guarantee_letter: { type: Number, default: 0 },
    factoring_90d: { type: Number, default: 0 },
    applications: { type: Number, default: 0 },
    projects: { type: Number, default: 0 },
    hseq: { type: Number, default: 0 }
}, { _id: false });

const CompositionSchema = Schema({
    label: String,
    required: String
}, { _id: false });

const ReferenceImageSchema = Schema({
    url: { type: String, required: true },
    caption: { type: String, default: 'Imagen Referencial' },
}, { _id: false });

const SubItemSchema = Schema({
    sub_item_number: Number,
    description: String,
    quantity: { type: Number, default: 1 },
    product_code: String,
    brand_code: String,
    brand_name: String,
    item_type: {
        type: String,
        enum: ['Consolidar', 'DHL', 'Reventa', 'Servicio'],
        default: 'Consolidar'
    },

    category: String,
    spk_family: String,
    currency: {
        type: String,
        enum: ['US$', 'EUR', 'S/.']
    },
    factory_price: { type: Number, default: 0 },
    pricing: PricingSchema,
    fixed_costs: FixedCostsSchema,

    notes: [String],
    technical_description: [String],

    reference_image: ReferenceImageSchema,

    validation: {
        type: String,
        enum: ['OK', 'ALT.', 'Comprado']
    },
    status: {
        type: String,
        enum: ['Necesario', 'Opcional', 'Alternativa']
    }
});


const ItemSchema = Schema({
    item_number: Number,
    title: String,
    subtitle: String,
    composition: [CompositionSchema],
    sub_items: [SubItemSchema]
});

const SectionSchema = Schema({
    section_number: Number,
    title: String,
    description: String,
    items: [ItemSchema]
});
const NoteSchema = Schema({
    note_number: Number,        // Nota 1, Nota 2...
    title: String,              // Título opcional
    content: String,            // HTML rico del editor
    images: [{
        url: String,            // URL de GCS
        caption: String,        // Pie de imagen opcional
        width: Number,          // Ancho original
        height: Number,         // Alto original
    }],
}, { _id: true });

const QuotationSchema = Schema({
    offer_number: {
        type: String,
        required: true,
    },
    reference: {
        type: String,
        required: true
    },
    revision: {
        type: String,
        required: true,
        default: '001'
    },
    full_reference: {
        type: String,
        required: true,
    },
    deal_id: String,
    template_version: String,
    client_id: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    client_name: String,
    contact_name: String,
    contact_email: String,
    prepared_by: {
        type: StaffRoleSchema,
        required: true
    },
    responsible: {
        type: StaffRoleSchema,
        required: true
    },
    approved_by: StaffRoleSchema,
    purchase_currency: {
        type: String,
        enum: ['EUR', 'US$'],
        required: true
    },
    offer_type: {
        type: String,
        enum: ['Local $', 'Local S/.', 'FCA'],
        required: true
    },
    client_type: {
        type: String,
        enum: ['01 Cliente Final', '02 Pyme', '03 Partner', '04 Canal', '05 Competencia'],
        required: true
    },
    offer_category: {
        type: String,
        enum: ['Técnico-Comercial', 'Técnica', 'Servicio'],
        required: true
    },
    language: {
        type: String,
        default: 'Español'
    },
    exchange_rates: {
        eur_to_usd: Number,
        usd_to_pen: Number
    },

    global_discount: {
        type: {
            type: String,
            default: '*** Seleccionar'
        },
        percentage: {
            type: Number,
            default: 0
        }
    },

    commercial_conditions: {
        payment_terms: String,
        delivery_time: String,
        delivery_place: String,
        incoterm: String,
        notes: [NoteSchema]
    },

    sections: [SectionSchema],
    totals: {
        purchase_total_usd: { type: Number, default: 0 },
        purchase_total_eur: { type: Number, default: 0 },
        import_cost_total: { type: Number, default: 0 },
        cisac_cost_total: { type: Number, default: 0 },
        custom_costs_total: { type: Number, default: 0 },
        fixed_costs_total: { type: Number, default: 0 },
        list_price_total: { type: Number, default: 0 },
        discount_total: { type: Number, default: 0 },
        final_price_total: { type: Number, default: 0 },
        margin_percentage: { type: Number, default: 0 },
        margin_amount: { type: Number, default: 0 },
        breakdown: {
            products: { type: Number, default: 0 },
            services: { type: Number, default: 0 },
            spare_parts: { type: Number, default: 0 }
        }
    },

    additional_costs: {
        import_from: String,
        total_purchase_europe_eur: Number,
        bank_interest_rate: Number,
        bank_interest_min_eur: Number,
        bank_interest_result_eur: Number,
        bank_interest_usd: Number,
        shipping: {
            provider: String,
            shipping_cost_usd: Number,
            customs_clearance: Number,
            delivery_to_warehouse: Number,
            local_delivery: Number
        }
    },

    status: {
        type: String,
        enum: ['Preparado', 'Responsable', 'Selección', 'Data Sheets', 'Aprobado C', 'Servicios', 'Manager'],
        default: 'Preparado'
    },

    sent_at: Date,
    valid_until: Date,
    attachments: [{
        name: String,
        type: String,
        url: String
    }]
}, {
    timestamps: true
});


QuotationSchema.index({ offer_number: 1, revision: 1 });
QuotationSchema.index({ client_id: 1 });
QuotationSchema.index({ 'prepared_by.staff_id': 1 });
QuotationSchema.index({ status: 1 });
QuotationSchema.index({ created_at: -1 });

module.exports = model('Quotation', QuotationSchema);