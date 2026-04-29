export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
}

export const products: Product[] = [
  { id: "1", title: "Short Sleeve Shirt", description: "A comfortable cotton shirt", price: 24.99 },
  { id: "2", title: "Slim Fit Jeans",     description: "Classic blue denim jeans",  price: 49.99 },
  { id: "3", title: "Running Sneakers",   description: "Lightweight sports shoes",   price: 89.99 },
  { id: "4", title: "Leather Belt",       description: "Genuine leather belt",       price: 19.99 },
];