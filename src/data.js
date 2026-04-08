export const menuData = {
  categories: [
    {
      id: "lunes",
      name: "Lunes",
      color: "#be123c", // rose-700
      items: [
        { name: "Caldo de Res con Verduras", price: 30 },
        { name: "Pollo Frito", price: 25 },
        { name: "Pechuga Frita", price: 30 },
        { name: "Milanesa de Res", price: 30 },
        { name: "Pollo en Crema", price: 30 },
        { name: "Tortitas de Carne", price: 30 }
      ]
    },
    {
      id: "martes",
      name: "Martes",
      color: "#c2410c", // orange-700
      items: [
        { name: "Caldo de Pata con Verduras", price: 30 },
        { name: "Filete de Pechuga a la Plancha", price: 25 },
        { name: "Ensalada Latina con Filete", price: 30 },
        { name: "Pollo Guisado", price: 25 },
        { name: "Tortitas de Carne", price: 30 },
        { name: "Bistec de Res", price: 30 },
        { name: "Panza en Amarillo", price: 25 },
        { name: "Hilachas", price: 30 }
      ]
    },
    {
      id: "miercoles",
      name: "Miércoles",
      color: "#1d4ed8", // blue-700
      items: [
        { name: "Pepián de Res", price: 30 },
        { name: "Pepián de Pollo", price: 25 },
        { name: "Pepián de Pechuga", price: 30 },
        { name: "Chapsui Mixto (Res, Cerdo)", price: 30 },
        { name: "Bistec a la Plancha", price: 30 },
        { name: "Salpicón de Res", price: 30 },
        { name: "Tortilla de Harina Res", price: 30 },
        { name: "Pollo Guisado", price: 25 }
      ]
    },
    {
      id: "jueves",
      name: "Jueves",
      color: "#b45309", // amber-700
      items: [
        { name: "Frijol Colorado con Costilla", price: 30 },
        { name: "Frijol Colorado con Chicharrón", price: 25 },
        { name: "Pechuga Rellena de Mozzarella", price: 30 },
        { name: "Tortillas de Harina de Res", price: 30 },
        { name: "Costilla", price: 30 },
        { name: "Salpicón de Res", price: 30 }
      ]
    },
    {
      id: "viernes",
      name: "Viernes",
      color: "#7e22ce", // purple-700
      items: [
        { name: "Carne Asada", price: 30 },
        { name: "Costilla Asada", price: 30 },
        { name: "Pollo Asado", price: 25 },
        { name: "Pechuga Asada", price: 30 },
        { name: "Caldo de Pollo Amarillo", price: 30 },
        { name: "Ceviche de Camarón", price: 35 },
        { name: "Birria", price: 40 },
        { name: "Filete de Pescado", price: 35 }
      ]
    },
    {
      id: "combos",
      name: "Combos",
      color: "#d97706", // amber-600
      items: [
        { name: "Combo 1 - 1 Doblada", price: 25, description: "1 Doblada + Fresco" },
        { name: "Combo 2 - 2 Dobladas", price: 30, description: "2 Dobladas + Fresco" },
        { name: "Combo 3 - 1 Doblada + 1 Bebida", price: 20, description: "1 Doblada + 1 Bebida" }
      ]
    },
    {
      id: "bebidas",
      name: "Bebidas",
      color: "#15803d", // green-700
      items: [
        { name: "7up lata", price: 7 },
        { name: "Coca-Cola lata", price: 7 },
        { name: "Coca-Cola Zero lata", price: 7 },
        { name: "Fanta naranja lata", price: 7 },
        { name: "Fanta uva en lata", price: 7 },
        { name: "Grapette lata", price: 7 },
        { name: "Jugo del valle lata", price: 6 },
        { name: "Jugos Petit", price: 5 },
        { name: "Limonada con Soda lata", price: 5 },
        { name: "Mineral lata", price: 7 },
        { name: "Mirinda lata", price: 7 },
        { name: "Naranja con soda lata", price: 5 },
        { name: "Pepsi Black lata", price: 7 },
        { name: "Pepsi lata", price: 7 },
        { name: "Rica Piña", price: 5 },
        { name: "Rica roja lata", price: 5 },
        { name: "Te frío Lipton", price: 10 }
      ]
    },
    {
      id: "extras",
      name: "Extras",
      color: "#0e7490", // cyan-700
      items: [
        { name: "Café", price: 5 },
        { name: "Café Grande", price: 7 },
        { name: "Doblada Tipo San Carlos", price: 15 },
        { name: "Fresco", price: 5 },
        { name: "Pan", price: 2 },
        { name: "Porción de Crema", price: 3 },
        { name: "Porción de tortillas", price: 2 },
        { name: "Cocoa", price: 5 }
      ]
    },
    {
      id: "desayunos",
      name: "Desayunos",
      color: "#a16207", // yellow-700
      items: [
        { name: "Desayuno Simple", price: 19 },
        { name: "Desayuno Ranchero", price: 20 },
        { name: "Desayuno de Chilaquiles", price: 22 },
        { name: "Desayuno con Embutidos", price: 22 },
        { name: "Desayuno con Omelette", price: 23 },
        { name: "Desayuno Campestre", price: 27 },
        { name: "Panqueques", price: 15 },
        { name: "Plátanos Cocidos", price: 10 },
        { name: "Tostadas", price: 7 }
      ]
    },
    {
      id: "panes",
      name: "Panes",
      color: "#ea580c", // orange-600
      items: [
        { name: "Pan con Adobado", price: 10 },
        { name: "Pan con Chile Relleno", price: 10 },
        { name: "Pan con Chuleta", price: 10 },
        { name: "Pan con Ensalada de Pollo", price: 10 },
        { name: "Pan con Frijol", price: 10 },
        { name: "Pan con Huevo", price: 10 },
        { name: "Pan con Jamón", price: 10 },
        { name: "Pan con Milanesa", price: 10 },
        { name: "Pan con Omelette", price: 10 },
        { name: "Pan con Salchicha", price: 10 },
        { name: "Pan con Torta de Carne", price: 10 }
      ]
    },
    {
      id: "tortillas",
      name: "Tortillas",
      color: "#ca8a04", // yellow-600
      items: [
        { name: "Tortilla con Adobado", price: 10 },
        { name: "Tortilla con Chile Relleno", price: 10 },
        { name: "Tortilla con Chuleta", price: 10 },
        { name: "Tortilla con Frijol", price: 10 },
        { name: "Tortilla con Huevo", price: 10 },
        { name: "Tortilla con Jamón", price: 10 },
        { name: "Tortilla con Milanesa", price: 10 },
        { name: "Tortilla con Omelette", price: 10 },
        { name: "Tortilla con Salchicha", price: 10 },
        { name: "Tortilla con Torta de Carne", price: 10 }
      ]
    },
    {
      id: "licuados",
      name: "Licuados",
      color: "#be185d", // pink-700
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
        { name: "Licuado de Café Con Leche", price: 12 },
        { name: "Licuado Mixto con Agua", price: 10 },
        { name: "Licuado Mixto con Leche", price: 12 }
      ]
    }
  ]
};
