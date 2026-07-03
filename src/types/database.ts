export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          phone: string | null
          dob: string | null
          gender: string | null
          role: 'customer' | 'admin'
          created_at: string
        }
        Insert: {
          id: string
          name?: string | null
          phone?: string | null
          dob?: string | null
          gender?: string | null
          role?: 'customer' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          phone?: string | null
          dob?: string | null
          gender?: string | null
          role?: 'customer' | 'admin'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          parent_category_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          parent_category_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          parent_category_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          category_id: string | null
          base_price: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          category_id?: string | null
          base_price: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          category_id?: string | null
          base_price?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          size: string
          color: string
          stock_qty: number
          sku: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          size: string
          color: string
          stock_qty: number
          sku: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          size?: string
          color?: string
          stock_qty?: number
          sku?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          url?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          line1: string
          city: string
          state: string
          pincode: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          line1: string
          city: string
          state: string
          pincode: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          line1?: string
          city?: string
          state?: string
          pincode?: string
          is_default?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          variant_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          variant_id: string
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          variant_id?: string
          quantity?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
        ]
      }
      wishlist_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          total: number
          address_id: string | null
          tracking_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          total: number
          address_id?: string | null
          tracking_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          total?: number
          address_id?: string | null
          tracking_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          variant_id: string | null
          quantity: number
          price_at_purchase: number
        }
        Insert: {
          id?: string
          order_id: string
          variant_id?: string | null
          quantity: number
          price_at_purchase: number
        }
        Update: {
          id?: string
          order_id?: string
          variant_id?: string | null
          quantity?: number
          price_at_purchase?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
        ]
      }
      coupons: {
        Row: {
          id: string
          code: string
          discount_type: 'percentage' | 'fixed'
          value: number
          expiry: string
          min_order_value: number
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          discount_type: 'percentage' | 'fixed'
          value: number
          expiry: string
          min_order_value?: number
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          discount_type?: 'percentage' | 'fixed'
          value?: number
          expiry?: string
          min_order_value?: number
          created_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          product_id: string
          user_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: 'customer' | 'admin'
    }
  }
}
