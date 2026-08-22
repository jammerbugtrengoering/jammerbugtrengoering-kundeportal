import { defineConfig } from "vite";

// Ingen react()-plugin. Vite 8 oversaetter selv JSX, og de to andre apps koerer ogsaa
// uden — det holdes ens paa tvaers af de tre, saa et build opfoerer sig forudsigeligt.
export default defineConfig({});
