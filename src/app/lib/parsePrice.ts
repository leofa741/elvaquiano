export const parsePrice = (price: string | number): number => {
    return typeof price === "string" ? parseFloat(price.replace(/[^\d.-]/g, "")) : price;
  };
  

  export const getSubtotal = (unitPrice: string | number, quantity: number): number => {
    return parsePrice(unitPrice) * quantity;
  };

  export const calculateDiscount = (
    unitPrice: string | number,
    quantity: number,
    discountEnabled: boolean
  ): number => {
    if (discountEnabled) {
      return getSubtotal(unitPrice, quantity) * 0.1; // 10% discount
    }
    return 0;
  };
