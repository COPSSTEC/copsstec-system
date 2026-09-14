export interface EcuadorProvince {
  name: string;
  cities: string[];
}

export const ECUADOR_PROVINCES: EcuadorProvince[] = [
  { name: "Azuay", cities: ["Cuenca", "Gualaceo", "Paute", "Sígsig"] },
  { name: "Bolívar", cities: ["Guaranda", "San Miguel", "Chillanes"] },
  { name: "Cañar", cities: ["Azogues", "Biblián", "Cañar"] },
  { name: "Carchi", cities: ["Tulcán", "Mira", "San Gabriel"] },
  { name: "Chimborazo", cities: ["Riobamba", "Guano", "Alausí"] },
  { name: "Cotopaxi", cities: ["Latacunga", "La Maná", "Pujilí", "Salcedo"] },
  { name: "El Oro", cities: ["Machala", "Pasaje", "Santa Rosa", "Huaquillas"] },
  { name: "Esmeraldas", cities: ["Esmeraldas", "Atacames", "Quinindé"] },
  { name: "Galápagos", cities: ["Puerto Baquerizo Moreno", "Puerto Ayora", "Puerto Villamil"] },
  { name: "Guayas", cities: ["Guayaquil", "Durán", "Samborondón", "Daule", "Milagro"] },
  { name: "Imbabura", cities: ["Ibarra", "Otavalo", "Cotacachi", "Atuntaqui"] },
  { name: "Loja", cities: ["Loja", "Catamayo", "Macará"] },
  { name: "Los Ríos", cities: ["Babahoyo", "Quevedo", "Ventanas"] },
  { name: "Manabí", cities: ["Portoviejo", "Manta", "Chone", "Bahía de Caráquez"] },
  { name: "Morona Santiago", cities: ["Macas", "Sucúa", "Gualaquiza"] },
  { name: "Napo", cities: ["Tena", "Archidona", "El Chaco"] },
  { name: "Orellana", cities: ["Francisco de Orellana", "La Joya de los Sachas"] },
  { name: "Pastaza", cities: ["Puyo", "Mera", "Santa Clara"] },
  { name: "Pichincha", cities: ["Quito", "Cayambe", "Sangolquí", "Tabacundo"] },
  { name: "Santa Elena", cities: ["Santa Elena", "La Libertad", "Salinas"] },
  { name: "Santo Domingo de los Tsáchilas", cities: ["Santo Domingo", "La Concordia"] },
  { name: "Sucumbíos", cities: ["Nueva Loja", "Shushufindi"] },
  { name: "Tungurahua", cities: ["Ambato", "Baños", "Pelileo"] },
  { name: "Zamora Chinchipe", cities: ["Zamora", "Yantzaza", "Zumba"] },
];
