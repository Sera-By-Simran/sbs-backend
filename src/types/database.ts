/**
 * SÉRA BY SIMRAN — Database Types
 * Generated and synchronized across applications from PostgreSQL schema.
 */

export type AppRole =
  | 'owner'
  | 'admin'
  | 'content_editor'
  | 'sourcing_manager'
  | 'fulfilment_manager'
  | 'support_agent'
  | 'analyst';

export type PublishStatus = 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';

export type PublicAvailability =
  | 'available_to_order'
  | 'made_to_order'
  | 'limited'
  | 'sold_out'
  | 'coming_soon'
  | 'hidden_price';

export type ProductBadge = 'none' | 'new_in' | 'bestseller' | 'limited_edition';

export type CollectionKind = 'collection' | 'edit' | 'occasion' | 'campaign';

export type MediaKind = 'image' | 'video' | 'document';

export type MediaVisibility = 'public' | 'private';

export type MediaSource =
  | 'studio_photo'
  | 'supplier_reference'
  | 'ai_assisted'
  | 'ai_generated'
  | 'stock_licensed'
  | 'customer_ugc';

export type MediaRole =
  | 'hero_model'
  | 'showcase'
  | 'detail_macro'
  | 'component'
  | 'flatlay_set'
  | 'lifestyle'
  | 'scale_fit'
  | 'showroom_layer'
  | 'other';

export type FidelityDecision = 'pending' | 'approved' | 'rejected';

export type SupplierAvailability = 'unknown' | 'in_stock' | 'limited' | 'out_of_stock' | 'discontinued';

export type EnquiryStatus =
  | 'new'
  | 'supplier_check'
  | 'availability_confirmed'
  | 'customer_confirmed'
  | 'unavailable'
  | 'cancelled';

export type OrderStatus =
  | 'customer_confirmed'
  | 'ordered'
  | 'sourced'
  | 'qc'
  | 'packed'
  | 'dispatched'
  | 'completed'
  | 'cancelled'
  | 'returned';

export type PaymentStatus =
  | 'unpaid'
  | 'payment_requested'
  | 'partially_paid'
  | 'paid'
  | 'refunded'
  | 'partially_refunded';

export type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'in_transit'
  | 'received'
  | 'refunded'
  | 'exchanged'
  | 'rejected';

export type ContactChannel = 'whatsapp' | 'phone' | 'email' | 'instagram' | 'in_person';

export type ShowroomChapterType =
  | 'exploded_product'
  | 'category_orbit'
  | 'craft_stages'
  | 'heritage_layers'
  | 'visit_info';

export type HomeSectionType =
  | 'hero'
  | 'trust_strip'
  | 'collection_grid'
  | 'editorial_banner'
  | 'product_rail'
  | 'edit_feature'
  | 'brand_story'
  | 'rich_text'
  | 'newsletter'
  | 'showroom';

// Table Row Interfaces

export interface CategoryRow {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  banner_media_id: string | null;
  banner_mobile_media_id: string | null;
  default_care_text: Record<string, unknown> | null;
  sort_order: number;
  show_in_nav: boolean;
  is_visible: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_og_media_id: string | null;
  seo_canonical_override: string | null;
  seo_noindex: boolean;
  seo_keywords: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProductRow {
  id: string;
  slug: string;
  sku: string;
  name: string;
  subtitle: string | null;
  short_description: string | null;
  description: Record<string, unknown> | null;
  primary_category_id: string | null;
  status: PublishStatus;
  published_at: string | null;
  scheduled_at: string | null;
  price_paise: number;
  compare_at_paise: number | null;
  currency: string;
  show_price: boolean;
  public_availability: PublicAvailability;
  availability_note: string | null;
  badge: ProductBadge;
  badge_override_until: string | null;
  is_gift_eligible: boolean;
  feature_bullets: Array<{ icon_key: string; text: string }> | null;
  details: Record<string, unknown> | null;
  care_override: Record<string, unknown> | null;
  shipping_returns_override: Record<string, unknown> | null;
  rank_bestseller: number | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_og_media_id: string | null;
  seo_canonical_override: string | null;
  seo_noindex: boolean;
  seo_keywords: string[];
  created_by: string | null;
  updated_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CollectionRow {
  id: string;
  kind: CollectionKind;
  slug: string;
  name: string;
  tagline: string | null;
  intro: Record<string, unknown> | null;
  hero_media_id: string | null;
  hero_mobile_media_id: string | null;
  rule: Record<string, unknown> | null;
  status: PublishStatus;
  starts_at: string | null;
  ends_at: string | null;
  show_in_nav: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MediaAssetRow {
  id: string;
  kind: MediaKind;
  visibility: MediaVisibility;
  bucket: string;
  path: string;
  original_filename: string | null;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  aspect_ratio: number | null;
  dominant_hex: string | null;
  blur_data_url: string | null;
  focal_x: number;
  focal_y: number;
  alt_text: string;
  caption: string | null;
  source: MediaSource;
  processing_status: 'pending' | 'ready' | 'failed';
  tags: string[];
  version: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnquiryRow {
  id: string;
  reference: string;
  customer_id: string | null;
  status: EnquiryStatus;
  source: string;
  message: string | null;
  needed_by: string | null;
  occasion: string | null;
  preferred_channel: ContactChannel;
  consent_contact: boolean;
  consent_marketing: boolean;
  utm: Record<string, unknown>;
  assigned_to: string | null;
  sla_due_at: string | null;
  quote_total_paise: number | null;
  quote_shipping_paise: number | null;
  quote_valid_until: string | null;
  quote_notes_public: string | null;
  converted_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  reference: string;
  enquiry_id: string;
  customer_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  ship_name: string;
  ship_phone: string;
  ship_line1: string;
  ship_line2: string | null;
  ship_city: string;
  ship_state: string;
  ship_pincode: string;
  ship_country: string;
  subtotal_paise: number;
  shipping_paise: number;
  discount_paise: number;
  tax_paise: number;
  total_paise: number;
  gift_note: string | null;
  is_gift: boolean;
  ordered_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteSettingsRow {
  key: string;
  value: unknown;
  is_public: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface TrustItemRow {
  id: string;
  icon_key: string;
  title: string;
  subtitle: string | null;
  scope: string;
  is_active: boolean;
  sort_order: number;
}
