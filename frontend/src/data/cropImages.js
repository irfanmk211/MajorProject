const PLACEHOLDER = "/images/placeholder-crop.svg";

export const cropImages = {
  apple:
    "https://images.pexels.com/photos/39803/pexels-photo-39803.jpeg?cs=srgb&dl=apple-food-fruit-39803.jpg&fm=jpg",

  banana:
    "https://aestheticwallpapers.io/wallpaper/875389.png",

  blackgram:
    "https://img3.exportersindia.com/product_images/bc-full/2023/8/6766978/black-gram-1690869441-7009269.jpeg",

  chickpea:
    "https://tse1.mm.bing.net/th/id/OIP.UikWsL90724yh3d-e9yDhgHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",

  coconut:
    "https://thecoconutmama.com/wp-content/uploads/2023/03/how-long-does-a-coconut-last-jpg.webp",

  coffee:
    "https://tse1.explicit.bing.net/th/id/OIP.PF8DYBJfLbhyjGsGuDT_WwHaE4?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",

  cotton:
    "https://tse1.mm.bing.net/th/id/OIP.NuhnRxglhU89lxjt_X-SQgHaFj?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",

  grapes:
    "https://tse1.mm.bing.net/th/id/OIP.lwbKkPOgtGmGsQ4Ok9GI2AHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",

  jute:
"https://as1.ftcdn.net/v2/jpg/05/18/93/48/1000_F_518934879_Ov4pRGH3oXLRomOyk0MN7szDYvDR74R2.jpg",
  kidneybeans:
"https://www.seriouseats.com/thmb/Q_pe8B0iSnvzAY-dXzC0UZNG5X8=/1500x1125/filters:fill(auto,1)/__opt__aboutcom__coeus__resources__content_migration__serious_eats__seriouseats.com__images__2016__07__20160707-legumes-red-kidney-beans-vicky-wasik-4-7835e58628a94f3fba1ad8d2defc3137.jpg",
  lentil:
"https://img.freepik.com/premium-photo/closeup-moth-beans-indian-name-matki-closeup-moth-beans-lesser-known-legume_1149265-37898.jpg?w=2000",
  maize:
    "https://www.healthbenefitstimes.com/9/gallery/corn/Corn-fruit.jpg",

  mango:
    "https://media.istockphoto.com/id/1356754119/photo/mango-fruit-and-mango-cubes-isolated-on-white-background.jpg?s=612x612&w=0&k=20&c=WX9JgUHS7kMIwyC4eNo9h_mIqWVBilHBnKANC2rvOTM=",

  mothbeans:
"https://img.freepik.com/premium-photo/closeup-moth-beans-indian-name-matki-closeup-moth-beans-lesser-known-legume_1149265-37898.jpg?w=2000",
  mungbean:
    "https://tse3.mm.bing.net/th/id/OIP.XaiZoFiI-klXfmyvyr-CewHaE6?r=0&pid=Api&h=220&P=0",

  muskmelon:
"https://static.vecteezy.com/system/resources/thumbnails/037/667/360/small_2x/ai-generated-view-of-delicious-fresh-fruit-muskmelon-on-a-white-background-photo.jpg",
  orange:
    "https://as2.ftcdn.net/jpg/04/20/70/97/1000_F_420709714_6WRLa14NhZ9gKE1UAjJJsxDld5WOMliJ.jpg",

  papaya:
"https://www.herbazest.com/imgs/2/d/6/3926/papaya.jpg",
  pigeonpeas:
    "https://tiimg.tistatic.com/fp/1/008/596/indian-origin-whole-toor-pigeon-peas-959.jpg",

  pomegranate:
    "https://tse4.mm.bing.net/th/id/OIP.C57hD3j-ImsfhZ3KjwBpWQHaHa?r=0&pid=Api&h=220&P=0",

  rice:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUgSHccG86B6C957BmFqC6NWtLVqOAIRT7z0_u2uEp-A&s=10",

  watermelon:
    "https://tse3.mm.bing.net/th/id/OIP.QR8RUkiS3HvN8Ox0hwcAFwHaEK?r=0&pid=Api&h=220&P=0",

  default: PLACEHOLDER,
};

const aliases = {
  "black gram": "blackgram",
  "black_gram": "blackgram",
  "green gram": "mungbean",
  "mung bean": "mungbean",
  "kidney beans": "kidneybeans",
  "moth beans": "mothbeans",
  "pigeon pea": "pigeonpeas",
  "sweet corn": "maize",
  corn: "maize",
};

export function normalizeCropKey(name = "") {
  const cleaned = name.toLowerCase().trim();

  if (aliases[cleaned]) {
    return aliases[cleaned];
  }

  return cleaned.replace(/[\s_-]+/g, "");
}

export function getCropImage(name) {
  const key = normalizeCropKey(name);
  return cropImages[key] || cropImages.default;
}

export function getCropImagePlaceholder() {
  return PLACEHOLDER;
}

export const CROP_CLASS_COUNT = Object.keys(cropImages).length - 1;