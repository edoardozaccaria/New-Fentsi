// ---- Place Search ----

export interface FoursquarePlaceSearchParams {
  query?: string;
  ll?: string;
  near?: string;
  radius?: number;
  categories?: string;
  limit?: number;
  sort?: 'relevance' | 'distance' | 'rating';
}

export interface FoursquarePlaceSearchResponse {
  results: FoursquarePlace[];
  context: {
    geo_bounds: {
      circle: {
        center: { latitude: number; longitude: number };
        radius: number;
      };
    };
  };
}

// ---- Place Core ----

export interface FoursquarePlace {
  fsq_id: string;
  name: string;
  categories: FoursquareCategory[];
  chains: FoursquareChain[];
  closed_bucket: string;
  distance?: number;
  geocodes: {
    main: FoursquareGeocode;
    roof?: FoursquareGeocode;
  };
  link: string;
  location: FoursquareLocation;
  timezone: string;
}

export interface FoursquareCategory {
  id: number;
  name: string;
  short_name: string;
  plural_name: string;
  icon: FoursquareIcon;
}

export interface FoursquareChain {
  id: string;
  name: string;
}

export interface FoursquareGeocode {
  latitude: number;
  longitude: number;
}

export interface FoursquareLocation {
  address?: string;
  address_extended?: string;
  census_block?: string;
  country: string;
  cross_street?: string;
  dma?: string;
  formatted_address: string;
  locality?: string;
  neighborhood?: string[];
  po_box?: string;
  post_town?: string;
  postcode?: string;
  region?: string;
}

export interface FoursquareIcon {
  prefix: string;
  suffix: string;
}

// ---- Place Details ----

export interface FoursquarePlaceDetails extends FoursquarePlace {
  description?: string;
  email?: string;
  fax?: string;
  hours?: FoursquareHours;
  hours_popular?: FoursquareHoursPopular[];
  menu?: string;
  popularity?: number;
  price?: number;
  rating?: number;
  social_media?: FoursquareSocialMedia;
  stats?: FoursquareStats;
  store_id?: string;
  tastes?: string[];
  tel?: string;
  verified?: boolean;
  website?: string;
}

export interface FoursquareHours {
  display: string;
  is_local_holiday: boolean;
  open_now: boolean;
  regular: FoursquareHoursRegular[];
}

export interface FoursquareHoursRegular {
  close: string;
  day: number;
  open: string;
}

export interface FoursquareHoursPopular {
  close: string;
  day: number;
  open: string;
}

export interface FoursquareSocialMedia {
  facebook_id?: string;
  instagram?: string;
  twitter?: string;
}

export interface FoursquareStats {
  total_photos: number;
  total_ratings: number;
  total_tips: number;
}

// ---- Photos ----

export interface FoursquarePhotosResponse {
  photos: FoursquarePhoto[];
}

export interface FoursquarePhoto {
  id: string;
  created_at: string;
  prefix: string;
  suffix: string;
  width: number;
  height: number;
  classifications?: string[];
}

/**
 * Construct a full photo URL from a Foursquare photo object.
 * Size format: "original", "300x300", "100x100", etc.
 */
export function buildPhotoUrl(photo: FoursquarePhoto, size = 'original'): string {
  return `${photo.prefix}${size}${photo.suffix}`;
}
