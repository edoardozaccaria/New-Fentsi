export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          locale: string | null;
          role: "user" | "partner" | "planner" | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          name?: string | null;
          locale?: string | null;
          role?: "user" | "partner" | "planner" | null;
          created_at?: string | null;
        };
        Update: {
          name?: string | null;
          locale?: string | null;
          role?: "user" | "partner" | "planner" | null;
          created_at?: string | null;
        };
      };
      event_types: {
        Row: {
          id: string;
          slug: string;
          name: string;
          presets: Json;
          min_budget: number;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          presets: Json;
          min_budget?: number;
        };
        Update: {
          slug?: string;
          name?: string;
          presets?: Json;
          min_budget?: number;
        };
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          project_name: string | null;
          event_type: string;
          custom_event_type: string | null;
          guests: number;
          budget: number;
          event_date: string | null;
          venue_style: string | null;
          custom_venue: string | null;
          mood: string | null;
          catering: string[];
          entertainment: string[];
          creative_brief: string | null;
          budget_allocation: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_name?: string | null;
          event_type: string;
          custom_event_type?: string | null;
          guests: number;
          budget: number;
          event_date?: string | null;
          venue_style?: string | null;
          custom_venue?: string | null;
          mood?: string | null;
          catering?: string[];
          entertainment?: string[];
          creative_brief?: string | null;
          budget_allocation?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          project_name?: string | null;
          event_type?: string;
          custom_event_type?: string | null;
          guests?: number;
          budget?: number;
          event_date?: string | null;
          venue_style?: string | null;
          custom_venue?: string | null;
          mood?: string | null;
          catering?: string[];
          entertainment?: string[];
          creative_brief?: string | null;
          budget_allocation?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          profile_id: string;
          assigned_profile_id: string | null;
          title: string | null;
          created_at: string;
          updated_at: string;
          submitted_at: string | null;
          email: string;
          full_name: string | null;
          phone: string | null;
          event_type: string;
          guest_count: number;
          event_date: string | null;
          location: string;
          budget_range: "budget_friendly" | "mid_range" | "luxury";
          services_needed: string[];
          special_requests: string | null;
          consent: boolean;
          status:
            | "draft"
            | "submitted"
            | "in_review"
            | "qualified"
            | "completed"
            | "archived";
          source: string;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_term: string | null;
          utm_content: string | null;
          plan_id: string | null;
          last_n8n_execution_id: string | null;
          n8n_workflow_id: string | null;
          last_contacted_at: string | null;
          notes: Json | null;
          raw_submission: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          profile_id: string;
          assigned_profile_id?: string | null;
          title?: string | null;
          submitted_at?: string | null;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          event_type: string;
          guest_count: number;
          event_date?: string | null;
          location: string;
          budget_range: "budget_friendly" | "mid_range" | "luxury";
          services_needed?: string[];
          special_requests?: string | null;
          consent?: boolean;
          status?:
            | "draft"
            | "submitted"
            | "in_review"
            | "qualified"
            | "completed"
            | "archived";
          source?: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_term?: string | null;
          utm_content?: string | null;
          plan_id?: string | null;
          last_n8n_execution_id?: string | null;
          n8n_workflow_id?: string | null;
          last_contacted_at?: string | null;
          notes?: Json | null;
          raw_submission?: Json | null;
        };
        Update: {
          created_at?: string;
          updated_at?: string;
          profile_id?: string;
          assigned_profile_id?: string | null;
          title?: string | null;
          submitted_at?: string | null;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          event_type?: string;
          guest_count?: number;
          event_date?: string | null;
          location?: string;
          budget_range?: "budget_friendly" | "mid_range" | "luxury";
          services_needed?: string[];
          special_requests?: string | null;
          consent?: boolean;
          status?:
            | "draft"
            | "submitted"
            | "in_review"
            | "qualified"
            | "completed"
            | "archived";
          source?: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_term?: string | null;
          utm_content?: string | null;
          plan_id?: string | null;
          last_n8n_execution_id?: string | null;
          n8n_workflow_id?: string | null;
          last_contacted_at?: string | null;
          notes?: Json | null;
          raw_submission?: Json | null;
        };
      };
      project_activities: {
        Row: {
          id: string;
          project_id: string;
          profile_id: string | null;
          action: string;
          details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          profile_id?: string | null;
          action: string;
          details?: string | null;
          created_at?: string;
        };
        Update: {
          project_id?: string;
          profile_id?: string | null;
          action?: string;
          details?: string | null;
          created_at?: string;
        };
      };
      plans: {
        Row: {
          id: string;
          user_id: string;
          event_type_id: string | null;
          guests_tier: string | null;
          total_budget_eur: number | null;
          locale: string | null;
          status: "draft" | "generated" | "booked" | null;
          fentsi_lead_id: string | null;
          consent_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type_id?: string | null;
          guests_tier?: string | null;
          total_budget_eur?: number | null;
          locale?: string | null;
          status?: "draft" | "generated" | "booked" | null;
          fentsi_lead_id?: string | null;
          consent_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          event_type_id?: string | null;
          guests_tier?: string | null;
          total_budget_eur?: number | null;
          locale?: string | null;
          status?: "draft" | "generated" | "booked" | null;
          fentsi_lead_id?: string | null;
          consent_at?: string | null;
          created_at?: string | null;
        };
      };
      plan_allocations: {
        Row: {
          id: string;
          plan_id: string;
          category:
            | "venue"
            | "catering"
            | "decor"
            | "entertainment"
            | "av"
            | "photo_video"
            | "misc";
          percent: number;
          amount_eur: number | null;
        };
        Insert: {
          id?: string;
          plan_id: string;
          category:
            | "venue"
            | "catering"
            | "decor"
            | "entertainment"
            | "av"
            | "photo_video"
            | "misc";
          percent: number;
          amount_eur?: number | null;
        };
        Update: {
          category?:
            | "venue"
            | "catering"
            | "decor"
            | "entertainment"
            | "av"
            | "photo_video"
            | "misc";
          percent?: number;
          amount_eur?: number | null;
        };
      };
      plan_choices: {
        Row: {
          id: string;
          plan_id: string;
          venue_style: string | null;
          catering_styles: string[] | null;
          decor_mood: string | null;
          extras: string[] | null;
        };
        Insert: {
          id?: string;
          plan_id: string;
          venue_style?: string | null;
          catering_styles?: string[] | null;
          decor_mood?: string | null;
          extras?: string[] | null;
        };
        Update: {
          venue_style?: string | null;
          catering_styles?: string[] | null;
          decor_mood?: string | null;
          extras?: string[] | null;
        };
      };
      plan_brief_assets: {
        Row: {
          id: string;
          plan_id: string;
          asset_type: "image" | "link" | "doc";
          url: string;
          title: string | null;
          meta: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          plan_id: string;
          asset_type: "image" | "link" | "doc";
          url: string;
          title?: string | null;
          meta?: Json | null;
          created_at?: string | null;
        };
        Update: {
          asset_type?: "image" | "link" | "doc";
          url?: string;
          title?: string | null;
          meta?: Json | null;
          created_at?: string | null;
        };
      };
      vendors: {
        Row: {
          id: string;
          profile_id: string | null;
          type: "venue" | "catering" | "entertainment" | "av" | "photo" | "decor" | "planner";
          name: string;
          city: string | null;
          country: string | null;
          direct_partner: boolean | null;
          aggregator: boolean | null;
          aggregator_source: string | null;
          price_band: "€" | "€€" | "€€€" | null;
          tags: string[] | null;
          active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          type: "venue" | "catering" | "entertainment" | "av" | "photo" | "decor" | "planner";
          name: string;
          city?: string | null;
          country?: string | null;
          direct_partner?: boolean | null;
          aggregator?: boolean | null;
          aggregator_source?: string | null;
          price_band?: "€" | "€€" | "€€€" | null;
          tags?: string[] | null;
          active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          profile_id?: string | null;
          type?: "venue" | "catering" | "entertainment" | "av" | "photo" | "decor" | "planner";
          name?: string;
          city?: string | null;
          country?: string | null;
          direct_partner?: boolean | null;
          aggregator?: boolean | null;
          aggregator_source?: string | null;
          price_band?: "€" | "€€" | "€€€" | null;
          tags?: string[] | null;
          active?: boolean | null;
          created_at?: string | null;
        };
      };
      vendor_matches: {
        Row: {
          id: string;
          plan_id: string;
          vendor_id: string;
          rank: number | null;
          reason: string | null;
          direct_partner: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          plan_id: string;
          vendor_id: string;
          rank?: number | null;
          reason?: string | null;
          direct_partner?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          rank?: number | null;
          reason?: string | null;
          direct_partner?: boolean | null;
          created_at?: string | null;
        };
      };
      bookings: {
        Row: {
          id: string;
          plan_id: string;
          vendor_id: string;
          booking_date: string | null;
          amount_eur: number | null;
          stripe_session_id: string | null;
          status: "initiated" | "paid" | "refunded" | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          plan_id: string;
          vendor_id: string;
          booking_date?: string | null;
          amount_eur?: number | null;
          stripe_session_id?: string | null;
          status?: "initiated" | "paid" | "refunded" | null;
          created_at?: string | null;
        };
        Update: {
          booking_date?: string | null;
          amount_eur?: number | null;
          stripe_session_id?: string | null;
          status?: "initiated" | "paid" | "refunded" | null;
          created_at?: string | null;
        };
      };
      referrals: {
        Row: {
          id: string;
          plan_id: string;
          vendor_id: string | null;
          kind: "direct" | "aggregator" | "affiliate";
          click_ts: string | null;
          conversion_ts: string | null;
          commission_eur: number | null;
          payload: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          plan_id: string;
          vendor_id?: string | null;
          kind: "direct" | "aggregator" | "affiliate";
          click_ts?: string | null;
          conversion_ts?: string | null;
          commission_eur?: number | null;
          payload?: Json | null;
          created_at?: string | null;
        };
        Update: {
          vendor_id?: string | null;
          kind?: "direct" | "aggregator" | "affiliate";
          click_ts?: string | null;
          conversion_ts?: string | null;
          commission_eur?: number | null;
          payload?: Json | null;
          created_at?: string | null;
        };
      };
      pro_subscriptions: {
        Row: {
          id: string;
          profile_id: string;
          stripe_sub_id: string;
          plan_name: string | null;
          status: "active" | "canceled" | null;
          renewal_ts: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          stripe_sub_id: string;
          plan_name?: string | null;
          status?: "active" | "canceled" | null;
          renewal_ts?: string | null;
          created_at?: string | null;
        };
        Update: {
          plan_name?: string | null;
          status?: "active" | "canceled" | null;
          renewal_ts?: string | null;
          created_at?: string | null;
        };
      };
      audit_events: {
        Row: {
          id: string;
          user_id: string | null;
          kind: string;
          payload: Json | null;
          ts: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          kind: string;
          payload?: Json | null;
          ts?: string | null;
        };
        Update: {
          user_id?: string | null;
          kind?: string;
          payload?: Json | null;
          ts?: string | null;
        };
      };
    };
  };
}
