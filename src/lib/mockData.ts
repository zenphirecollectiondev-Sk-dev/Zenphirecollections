import linenShirt from '../assets/product_linen_shirt.png';
import tailoredPants from '../assets/product_tailored_pants.png';
import minimalJacket from '../assets/product_minimal_jacket.png';
import categoryFemale from '../assets/category_female_fashion.png';

// Categories mock
export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
}

export const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Male',
    slug: 'male',
    image: linenShirt
  },
  {
    id: 'cat-2',
    name: 'Female',
    slug: 'female',
    image: categoryFemale
  },
  {
    id: 'cat-3',
    name: 'Unisex',
    slug: 'unisex',
    image: minimalJacket
  }
];

// Product details mock matching database structures
export interface MockProductVariant {
  id: string;
  size: string;
  color: string;
  stock_qty: number;
  sku: string;
}

export interface MockProductImage {
  id: string;
  url: string;
  sort_order: number;
}

export interface MockProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  base_price: number;
  is_active: boolean;
  product_images: MockProductImage[];
  product_variants: MockProductVariant[];
}

export const mockProducts: MockProduct[] = [
  {
    id: 'prod-1',
    name: 'Relaxed Linen Shirt',
    slug: 'relaxed-linen-shirt',
    description: 'Crafted from premium European flax, this relaxed-fit linen shirt offers breathable luxury for the warmer months. Featuring a clean collarless neck, mother-of-pearl buttons, and raw textured details.',
    category_id: 'cat-1',
    base_price: 89.00,
    is_active: true,
    product_images: [
      { id: 'img-1-1', url: linenShirt, sort_order: 1 },
      { id: 'img-1-2', url: linenShirt, sort_order: 2 }
    ],
    product_variants: [
      { id: 'var-1-1', size: 'S', color: 'Off-White', stock_qty: 12, sku: 'ZP-LIN-WHT-S' },
      { id: 'var-1-2', size: 'M', color: 'Off-White', stock_qty: 8, sku: 'ZP-LIN-WHT-M' },
      { id: 'var-1-3', size: 'L', color: 'Off-White', stock_qty: 3, sku: 'ZP-LIN-WHT-L' },
      { id: 'var-1-4', size: 'XL', color: 'Off-White', stock_qty: 0, sku: 'ZP-LIN-WHT-XL' }
    ]
  },
  {
    id: 'prod-2',
    name: 'Tailored Charcoal Trousers',
    slug: 'tailored-charcoal-trousers',
    description: 'Expertly tailored from lightweight worsted wool, these trousers feature a neat pressed crease, clean slide adjustments, and a subtle straight leg drop. Ideal for high-end casual pairings.',
    category_id: 'cat-2',
    base_price: 120.00,
    is_active: true,
    product_images: [
      { id: 'img-2-1', url: tailoredPants, sort_order: 1 },
      { id: 'img-2-2', url: tailoredPants, sort_order: 2 }
    ],
    product_variants: [
      { id: 'var-2-1', size: 'S', color: 'Charcoal', stock_qty: 5, sku: 'ZP-TRS-GRY-S' },
      { id: 'var-2-2', size: 'M', color: 'Charcoal', stock_qty: 15, sku: 'ZP-TRS-GRY-M' },
      { id: 'var-2-3', size: 'L', color: 'Charcoal', stock_qty: 2, sku: 'ZP-TRS-GRY-L' }
    ]
  },
  {
    id: 'prod-3',
    name: 'Minimalist Cropped Jacket',
    slug: 'minimalist-cropped-jacket',
    description: 'A structural cropped worker jacket made of dense organic duck cotton. Detailed with hidden button placket, welt handwarmer pockets, and a clean minimal box profile.',
    category_id: 'cat-3',
    base_price: 150.00,
    is_active: true,
    product_images: [
      { id: 'img-3-1', url: minimalJacket, sort_order: 1 },
      { id: 'img-3-2', url: minimalJacket, sort_order: 2 }
    ],
    product_variants: [
      { id: 'var-3-1', size: 'S', color: 'Noir Black', stock_qty: 2, sku: 'ZP-JKT-BLK-S' },
      { id: 'var-3-2', size: 'M', color: 'Noir Black', stock_qty: 9, sku: 'ZP-JKT-BLK-M' },
      { id: 'var-3-3', size: 'L', color: 'Noir Black', stock_qty: 11, sku: 'ZP-JKT-BLK-L' }
    ]
  },
  // Extra products using existing images to fill the grids beautifully
  {
    id: 'prod-4',
    name: 'Oversized Linen Tunic',
    slug: 'oversized-linen-tunic',
    description: 'An elongated variant of our signature linen cut, designed with extra room and drape. Light and airy.',
    category_id: 'cat-2',
    base_price: 95.00,
    is_active: true,
    product_images: [
      { id: 'img-4-1', url: linenShirt, sort_order: 1 }
    ],
    product_variants: [
      { id: 'var-4-1', size: 'S', color: 'Sand Beige', stock_qty: 6, sku: 'ZP-TNC-SND-S' },
      { id: 'var-4-2', size: 'M', color: 'Sand Beige', stock_qty: 12, sku: 'ZP-TNC-SND-M' }
    ]
  },
  {
    id: 'prod-5',
    name: 'Concrete Pleated Pants',
    slug: 'concrete-pleated-pants',
    description: 'Featuring single front pleats and a relaxed fit, these trousers bridge comfort and tailoring.',
    category_id: 'cat-1',
    base_price: 115.00,
    is_active: true,
    product_images: [
      { id: 'img-5-1', url: tailoredPants, sort_order: 1 }
    ],
    product_variants: [
      { id: 'var-5-1', size: 'M', color: 'Concrete Grey', stock_qty: 14, sku: 'ZP-PLT-GRY-M' },
      { id: 'var-5-2', size: 'L', color: 'Concrete Grey', stock_qty: 0, sku: 'ZP-PLT-GRY-L' }
    ]
  },
  {
    id: 'prod-6',
    name: 'Raw Canvas Overshirt',
    slug: 'raw-canvas-overshirt',
    description: 'Heavyweight organic canvas overshirt designed for transitional layering. Double utility pockets.',
    category_id: 'cat-3',
    base_price: 130.00,
    is_active: true,
    product_images: [
      { id: 'img-6-1', url: minimalJacket, sort_order: 1 }
    ],
    product_variants: [
      { id: 'var-6-1', size: 'S', color: 'Ecru White', stock_qty: 7, sku: 'ZP-OVR-ECR-S' },
      { id: 'var-6-2', size: 'M', color: 'Ecru White', stock_qty: 4, sku: 'ZP-OVR-ECR-M' }
    ]
  }
];
