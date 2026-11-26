import { describe, expect, it } from "vitest";
import {
  deleteProduct,
  fictionalOffers,
  fictionalProducts,
  offerSchema,
  productSchema,
  upsertProduct
} from "./index";

describe("domain and CRUD", () => {
  it("validates the three exact requested products in BRL", () => {
    expect(fictionalProducts.map((item) => [item.name, item.targetPriceBrl])).toEqual([
      ["Mac mini 32 GB / 512 GB", 9000],
      ["Corsair Void Wireless V2", 550],
      ["TCL P7L 50 QLED 4K", 2000]
    ]);
    fictionalProducts.forEach((product) => expect(productSchema.parse(product)).toEqual(product));
  });

  it("includes fictional Mac 16/32 GB and new/refurbished variants", () => {
    const macOffers = fictionalOffers.filter((offer) => offer.productId === "mac-mini-32-512");
    expect(macOffers.some((offer) => offer.title.includes("16 GB"))).toBe(true);
    expect(macOffers.some((offer) => offer.title.includes("32 GB"))).toBe(true);
    expect(new Set(macOffers.map((offer) => offer.condition))).toEqual(
      new Set(["new", "refurbished"])
    );
    macOffers.forEach((offer) => expect(offerSchema.parse(offer)).toEqual(offer));
  });

  it("creates, updates, and deletes products", () => {
    const original = fictionalProducts[0]!;
    expect(upsertProduct([], original)).toEqual([original]);
    const edited = { ...original, name: "Editado" };
    expect(upsertProduct([original], edited)[0]?.name).toBe("Editado");
    expect(deleteProduct([edited], edited.id)).toEqual([]);
  });
});
