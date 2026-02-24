export const menuData = {
  categories: [
    {
      id: "lunes",
      name: "Lunes",
      color: "#dc2626", // red-600
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
      color: "#ea580c", // orange-600
      items: [
        { name: "Caldo de Pata con Verduras", price: 30 },
        { name: "Filete de Pechuga a la Plancha", price: 25 },
        { name: "Ensalada Latina con Filete", price: 30 },
        { name: "Pollo Guisado", price: 25 },
        { name: "Tortitas de Carne", price: 30 },
        { name: "Bistec de Res", price: 30 },
        { name: "Panza en Amarillo", price: 25 }
      ]
    },
    {
      id: "miercoles",
      name: "Miércoles",
      color: "#2563eb", // blue-600
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
      color: "#a16207", // yellow-700 -> amber? I'll use a better amber
      items: [
        { name: "Frijol Colorado con Costilla", price: 30 },
        { name: "Frijol Colorado con Chicharrón", price: 25 },
        { name: "Pechuga Rellena de Mozzarella", price: 30 },
        { name: "Tortillas de Harina de Res", price: 30 },
        { name: "Costilla en Barbacoa", price: 25 },
        { name: "Salpicón de Res", price: 30 }
      ]
    },
    {
      id: "viernes",
      name: "Viernes",
      color: "#9333ea", // purple-600
      items: [
        { name: "Carne Asada", price: 30 },
        { name: "Costilla Asada", price: 30 },
        { name: "Pollo Asado", price: 25 },
        { name: "Pechuga Asada", price: 30 },
        { name: "Caldo de Pollo Amarillo", price: 30 },
        { name: "Ceviche de Camarón", price: 35 }
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
        { name: "Huevos al gusto simple", price: 17 },
        { name: "Huevos al Gusto", price: 18 },
        { name: "Huevos Revueltos", price: 19 },
        { name: "Huevos especiales", price: 20 },
        { name: "Campestre", price: 25 },
        { name: "Chilaquiles", price: 20 }
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
        { name: "Licuado de Café Con Leche", price: 12 },
        { name: "Licuado Mixto con Agua", price: 10 },
        { name: "Licuado Mixto con Leche", price: 12 }
      ]
    }
  ]
};
