export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
}

export const products: Product[] = [
  {
    id: "19ba3d6a-f8ed-491b-a192-0a33b71b38c4",
    title: "Short Sleeve Shirt",
    description: "A comfortable cotton shirt",
    price: 25,
  },
  {
    id: "2099f2f0-8d53-4d22-b393-a4504f8f67d0",
    title: "Slim Fit Jeans",
    description: "Classic blue denim jeans",
    price: 50,
  },
  {
    id: "80d29cbb-42e4-4b4a-a4f8-e0f81a3f8f9b",
    title: "Running Sneakers",
    description: "Lightweight sports shoes",
    price: 90,
  },
  {
    id: "f6341d0f-e04f-4c13-9ae8-b12f80f79a7d",
    title: "Leather Belt",
    description: "Genuine leather belt",
    price: 20,
  },
];
