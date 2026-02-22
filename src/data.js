export const menuData = {
  categories: [
    {
      id: "lunes",
      name: "Lunes",
      color: "#dc2626", // red-600
      items: [
        { name: "Caldo de Res con Verduras", price: 30, description: "+ Arroz + Aguacate + Fresco Natural + Tortillas" },
        { name: "Pollo Frito", price: 25, description: "+ Guacamol, Ensalada, Zuchinis o Arroz + Fresco Natural + Tortillas" },
        { name: "Pechuga Frita", price: 30, description: "+ Guacamol, Ensalada, Zuchinis o Arroz + Fresco Natural + Tortillas" },
        { name: "Milanesa de Res", price: 30, description: "+ Guacamol, Ensalada, Zuchinis o Arroz + Fresco Natural + Tortillas" },
        { name: "Pollo en Crema", price: 30, description: "+ Guacamol, Ensalada, Zuchinis o Arroz + Fresco Natural + Tortillas" },
        { name: "Tortitas de Carne", price: 30, description: "+ Acompañamientos variados + Fresco Natural + Tortillas" }
      ]
    },
    {
      id: "martes",
      name: "Martes",
      color: "#ea580c", // orange-600
      items: [
        { name: "Caldo de Pata con Verduras", price: 30, description: "+ Más Arroz + Limón + Fresco Natural + Tortillas" },
        { name: "Filete de Pechuga a la Plancha", price: 25, description: "+ Guacamol, Ensalada verde, Ensalada Rusa o Arroz + Fresco Natural + Tortillas" },
        { name: "Ensalada Latina con Filete", price: 30, description: "+ Guacamol, Ensalada verde, Ensalada Rusa o Arroz + Fresco Natural + Tortillas" },
        { name: "Pollo Guisado", price: 25, description: "+ Guacamol, Ensalada verde, Ensalada Rusa o Arroz + Fresco Natural + Tortillas" },
        { name: "Tortitas de Carne", price: 30, description: "+ Guacamol, Ensalada verde, Ensalada Rusa o Arroz + Fresco Natural + Tortillas" },
        { name: "Bistec de Res", price: 30, description: "+ Guacamol, Ensalada verde, Ensalada Rusa o Arroz + Fresco Natural + Tortillas" },
        { name: "Panza en Amarillo", price: 25, description: "+ Guacamol, Ensalada verde, Ensalada Rusa o Arroz + Fresco Natural + Tortillas" }
      ]
    },
    {
      id: "miercoles",
      name: "Miércoles",
      color: "#2563eb", // blue-600
      items: [
        { name: "Pepián de Res", price: 30, description: "+ Fresco Natural + Tortillas" },
        { name: "Pepián de Pollo", price: 25, description: "+ Fresco Natural + Tortillas" },
        { name: "Pepián de Pechuga", price: 30, description: "+ Fresco Natural + Tortillas" },
        { name: "Chapsui Mixto (Res, Cerdo)", price: 30, description: "+ Guacamol, Espagueti con Mantequilla, Ensalada de pepino o Arroz + Fresco Natural + Tortillas" },
        { name: "Bistec a la Plancha", price: 30, description: "+ Guacamol, Espagueti con Mantequilla, Ensalada de pepino o Arroz + Fresco Natural + Tortillas" },
        { name: "Salpicón de Res", price: 30, description: "+ Guacamol, Espagueti con Mantequilla, Ensalada de pepino o Arroz + Fresco Natural + Tortillas" },
        { name: "Tortilla de Harina Res", price: 30, description: "+ Guacamol, Ensalada de pepino, Espagueti o Arroz + Fresco Natural + Tortillas" },
        { name: "Pollo Guisado", price: 25, description: "+ Guacamol, Ensalada de pepino, Espagueti o Arroz + Fresco Natural + Tortillas" }
      ]
    },
    {
      id: "jueves",
      name: "Jueves",
      color: "#a16207", // yellow-700 -> amber? I'll use a better amber
      items: [
        { name: "Frijol Colorado con Costilla", price: 30, description: "+ Fresco Natural + Tortillas" },
        { name: "Frijol Colorado con Chicharrón", price: 25, description: "+ Fresco Natural + Tortillas" },
        { name: "Pechuga Rellena de Mozzarella", price: 30, description: "+ Guacamol, Ensalada hawaiana, Ensalada de papa o Arroz + Fresco Natural + Tortillas" },
        { name: "Tortillas de Harina de Res", price: 30, description: "+ Fresco Natural" },
        { name: "Costilla en Barbacoa", price: 25, description: "+ Guacamol, Ensalada hawaiana, Ensalada de papa o Arroz + Fresco Natural + Tortillas" },
        { name: "Salpicón de Res", price: 30, description: "+ Guacamol, Ensalada hawaiana, Ensalada de papa o Arroz + Fresco Natural + Tortillas" }
      ]
    },
    {
      id: "viernes",
      name: "Viernes",
      color: "#9333ea", // purple-600
      items: [
        { name: "Carne Asada", price: 30, description: "+ Guacamol, Frijoles Volteados, Coditos con Mayonesa o Papas Baby con Mantequilla + Fresco Natural + Tortillas" },
        { name: "Costilla Asada", price: 30, description: "+ Guacamol, Frijoles Volteados, Coditos con Mayonesa o Papas Baby con Mantequilla + Fresco Natural + Tortillas" },
        { name: "Pollo Asado", price: 25, description: "+ Guacamol, Frijoles Volteados, Coditos con Mayonesa o Papas Baby con Mantequilla + Fresco Natural + Tortillas" },
        { name: "Pechuga Asada", price: 30, description: "+ Guacamol, Frijoles Volteados, Coditos con Mayonesa o Papas Baby con Mantequilla + Fresco Natural + Tortillas" },
        { name: "Caldo de Pollo Amarillo", price: 30, description: "+ Fresco Natural + Tortillas" },
        { name: "Ceviche de Camarón", price: 35, description: "+ Tomate, Cebolla, Cilantro, Limón + Galletas de soda" }
      ]
    },
    {
      id: "combos",
      name: "Combos",
      color: "#eab308", // yellow-500
      items: [
        { name: "Combo 1 - 1 Doblada", price: 25, description: "1 Doblada + Fresco" },
        { name: "Combo 2 - 2 Dobladas", price: 30, description: "2 Dobladas + Fresco" },
        { name: "Combo 3 - 1 Doblada + 1 Bebida", price: 20, description: "1 Doblada + 1 Bebida" }
      ]
    },
    {
      id: "bebidas",
      name: "Bebidas",
      color: "#16a34a", // green-600
      items: [
        { name: "7up lata", price: 6 },
        { name: "Coca-Cola lata", price: 7 },
        { name: "Coca-Cola Zero lata", price: 7 },
        { name: "Fanta naranja lata", price: 7 },
        { name: "Fanta uva en lata", price: 7 },
        { name: "Grapette lata", price: 6 },
        { name: "Jugo del valle lata", price: 6 },
        { name: "Jugos Petit", price: 5 },
        { name: "Mineral lata", price: 7 },
        { name: "Mirinda lata", price: 6 },
        { name: "Naranja con soda lata", price: 5 },
        { name: "Pepsi Black lata", price: 6 },
        { name: "Pepsi lata", price: 6 },
        { name: "Rica Piña", price: 5 },
        { name: "Rica roja lata", price: 5 },
        { name: "Te frío Lipton", price: 10 }
      ]
    },
    {
      id: "extras",
      name: "Extras",
      color: "#0891b2", // cyan-600
      items: [
        { name: "Doblada Tipo San Carlos", price: 15 },
        { name: "Porción de Crema", price: 3 },
        { name: "Porción de tortillas", price: 2 }
      ]
    },
    {
      id: "desayunos",
      name: "Desayunos",
      color: "#b45309", // amber-700
      items: [
        { name: "Huevos al Gusto (Simples/Estrellados/etc)", price: 17, description: "Incluye: Frijoles, Plátanos Fritos, 1 Café, Tortilla o Pan" },
        { name: "Huevos al Gusto (Tomate/Cebolla/Rancheros)", price: 18, description: "Incluye: Frijoles, Plátanos Fritos, 1 Café, Tortilla o Pan" },
        { name: "Huevos Revueltos con Jamón/Salchicha", price: 19, description: "Incluye: Frijoles, Plátanos Fritos, 1 Café, Tortilla o Pan" },
        { name: "Huevos Especial (Chorizo/Longaniza/Omelette)", price: 20, description: "Incluye: Frijoles, Plátanos Fritos, 1 Café, Tortilla o Pan" },
        { name: "Campestre (Milanesa/Adobado)", price: 25, description: "Incluye: Frijoles, Plátanos Fritos, 1 Café, Tortilla o Pan" },
        { name: "Chilaquiles", price: 20, description: "Incluye: 1 Café" }
      ]
    },
    {
      id: "panes",
      name: "Panes",
      color: "#f97316", // orange-500
      items: [
        { name: "Pan con Adobado", price: 10 },
        { name: "Pan con Chile Relleno", price: 10 },
        { name: "Pan con Chuleta", price: 10 },
        { name: "Pan con Ensalada de Pollo", price: 10 },
        { name: "Pan con Frijol", price: 10 },
        { name: "Pan con Huevo", price: 10 },
        { name: "Pan con Milanesa", price: 10 },
        { name: "Pan con Omelette", price: 10 },
        { name: "Pan con Torta de Carne", price: 10 }
      ]
    },
    {
      id: "licuados",
      name: "Licuados",
      color: "#db2777", // pink-600
      items: [
        { name: "Licuado de Papaya Con Agua", price: 10 },
        { name: "Licuado de Melón Con Agua", price: 10 },
        { name: "Licuado de Piña Con Agua", price: 10 },
        { name: "Licuado de Banano Con Agua", price: 10 },
        { name: "Licuado de Fresa Con Agua", price: 10 },
        { name: "Licuado de Mora Con Agua", price: 10 },
        { name: "Licuado de Oreo Con Agua", price: 10 },
        { name: "Licuado de Café Con Agua", price: 10 },
        { name: "Licuado de Papaya Con Leche", price: 12 },
        { name: "Licuado de Melón Con Leche", price: 12 },
        { name: "Licuado de Piña Con Leche", price: 12 },
        { name: "Licuado de Banano Con Leche", price: 12 },
        { name: "Licuado de Fresa Con Leche", price: 12 },
        { name: "Licuado de Mora Con Leche", price: 12 },
        { name: "Licuado de Oreo Con Leche", price: 12 },
        { name: "Licuado de Café Con Leche", price: 12 }
      ]
    }
  ]
};
