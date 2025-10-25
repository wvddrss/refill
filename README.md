# 🗺️ Refuel - GPX Route Planning App

Refuel is a mobile app that helps you plan your routes with essential stops along the way. Load a GPX file, find water supplies, stores, and restaurants near your route, and export a modified GPX with your selected stops.

## 🎯 Features

- **Load GPX Files**: Import your existing GPX routes
- **Find POIs**: Automatically discover Points of Interest along your route:
  - 💧 Water Supply (drinking water, wells, water points)
  - 🏪 Stores (convenience stores, supermarkets)
  - 🍽️ Food/Restaurants (restaurants, cafes, fast food)
- **Customizable Search**: Set maximum deviation from route (default 5km)
- **Interactive Map**: View your route with POI markers
- **Route Generation**: Generate optimized routes with selected stops
- **GPX Export**: Export your modified route as GPX

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Studio (for Android development)

### Installation

1. Clone the repository
```bash
cd Refuel
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Run on your device
```bash
# For iOS
npm run ios

# For Android
npm run android

# For web (limited functionality)
npm run web
```

## 📱 How to Use

1. **Load GPX File**
   - Launch the app
   - Tap "📁 Load GPX File"
   - Select a GPX file from your device

2. **Select POI Types**
   - Choose which types of stops you want to find:
     - Water Supply (highly recommended)
     - Stores
     - Food/Restaurants
   - Set maximum deviation from route (in km)
   - Tap "Next"

3. **View and Select POIs**
   - Browse the map with your route and nearby POIs
   - Tap markers on the map or use checkboxes in the bottom sheet
   - View POI details (name, type, distance from route)

4. **Generate New Route**
   - Select POIs you want to visit
   - Tap "🗺️ Generate New Route"
   - View the modified route with your selected stops

5. **Export GPX**
   - Tap "💾 Export GPX" to save your route
   - Share the GPX file with other apps

## 🏗️ Project Structure

```
Refuel/
├── app/                    # App screens (Expo Router)
│   ├── index.tsx          # Home/GPX upload screen
│   ├── poi-selection.tsx  # POI type selection screen
│   ├── map.tsx            # Map screen with bottom sheet
│   ├── _layout.tsx        # Root layout
│   └── ...
├── components/            # Reusable components
│   ├── Button.tsx
│   ├── Container.tsx
│   └── ...
├── store/                 # Zustand state management
│   └── store.ts           # App state and actions
├── utils/                 # Utility functions
│   ├── gpxParser.ts       # GPX parsing and generation
│   ├── poiService.ts      # OpenStreetMap API integration
│   └── routeGenerator.ts  # Route optimization logic
└── ...
```

## 🛠️ Technologies Used

- **React Native** - Mobile app framework
- **Expo** - Development platform
- **Expo Router** - File-based routing
- **NativeWind** - Tailwind CSS for React Native
- **Zustand** - State management
- **react-native-maps** - Map display
- **@gorhom/bottom-sheet** - Bottom sheet component
- **fast-xml-parser** - GPX parsing
- **OpenStreetMap Overpass API** - POI data

## 🌐 Data Sources

POI data is fetched from OpenStreetMap via the Overpass API. The app searches for:
- **Water Supply**: `amenity=drinking_water`, `man_made=water_well`, `amenity=water_point`
- **Stores**: `shop=convenience`, `shop=supermarket`, `shop=general`
- **Food**: `amenity=restaurant`, `amenity=cafe`, `amenity=fast_food`

## 📝 Development

### Code Style

The project uses ESLint and Prettier for code formatting:

```bash
# Check code style
npm run lint

# Format code
npm run format
```

### Building for Production

```bash
# Create a production build
npm run prebuild

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- OpenStreetMap contributors for POI data
- Expo team for the amazing development platform
- React Native community

## 📞 Support

If you encounter any issues or have questions, please open an issue on the repository.

---

**Happy routing! 🚴‍♂️🏃‍♀️🚶‍♂️**

