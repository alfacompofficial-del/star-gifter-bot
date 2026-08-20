import { useState, useEffect, useCallback } from "react";
import type { Product } from "./useProducts";

// Create a custom event target to sync state across components
const favoritesEmitter = new EventTarget();

export interface FavoriteItem extends Product {}

export const useFavorites = () => {
  const [items, setItems] = useState<number[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("liked_products");
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Sync state between hook instances
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<number[]>;
      setItems(customEvent.detail);
    };

    favoritesEmitter.addEventListener("favorites-updated", handleSync);
    return () => favoritesEmitter.removeEventListener("favorites-updated", handleSync);
  }, []);

  const toggleFavorite = useCallback((id: number) => {
    setItems((currentItems) => {
      let newItems;
      if (currentItems.includes(id)) {
        newItems = currentItems.filter((i) => i !== id);
      } else {
        newItems = [...currentItems, id];
      }
      
      try {
        localStorage.setItem("liked_products", JSON.stringify(newItems));
        // Notify other components
        favoritesEmitter.dispatchEvent(
          new CustomEvent("favorites-updated", { detail: newItems })
        );
      } catch {}
      
      return newItems;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setItems([]);
    try {
      localStorage.setItem("liked_products", JSON.stringify([]));
      favoritesEmitter.dispatchEvent(
        new CustomEvent("favorites-updated", { detail: [] })
      );
    } catch {}
  }, []);

  return {
    items,
    count: items.length,
    isOpen,
    setIsOpen,
    toggleFavorite,
    clearFavorites,
  };
};
