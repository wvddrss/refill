import { create } from 'zustand';

// Types
export interface GPXPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
}

export interface GPXRoute {
  name?: string;
  points: GPXPoint[];
}

export interface POIType {
  id: string;
  label: string;
  enabled: boolean;
  osmTags: string[]; // OpenStreetMap tags to search for
}

export interface POI {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  selected: boolean;
  distanceFromRoute: number;
  distanceAlongRoute: number; // Distance from start of route to this POI (in km)
}

export interface AppState {
  // GPX Data
  originalRoute: GPXRoute | null;
  modifiedRoute: GPXRoute | null;
  gpxFileName: string | null;

  // POI Settings
  poiTypes: POIType[];
  maxDeviation: number; // in kilometers
  pois: POI[];

  // Actions
  setOriginalRoute: (route: GPXRoute, fileName: string) => void;
  setModifiedRoute: (route: GPXRoute) => void;
  togglePOIType: (id: string) => void;
  setMaxDeviation: (deviation: number) => void;
  setPOIs: (pois: POI[]) => void;
  togglePOI: (id: string) => void;
  reset: () => void;
}

const defaultPOITypes: POIType[] = [
  {
    id: 'water',
    label: 'Water Supply',
    enabled: true,
    osmTags: ['amenity=drinking_water', 'man_made=water_well', 'amenity=water_point'],
  },
  {
    id: 'store',
    label: 'Stores',
    enabled: false,
    osmTags: ['shop=convenience', 'shop=supermarket', 'shop=general'],
  },
  {
    id: 'food',
    label: 'Food / Resto',
    enabled: false,
    osmTags: ['amenity=restaurant', 'amenity=cafe', 'amenity=fast_food'],
  },
];

export const useStore = create<AppState>((set) => ({
  // Initial State
  originalRoute: null,
  modifiedRoute: null,
  gpxFileName: null,
  poiTypes: defaultPOITypes,
  maxDeviation: 5,
  pois: [],

  // Actions
  setOriginalRoute: (route, fileName) => set({ originalRoute: route, gpxFileName: fileName }),

  setModifiedRoute: (route) => set({ modifiedRoute: route }),

  togglePOIType: (id) =>
    set((state) => ({
      poiTypes: state.poiTypes.map((poi) =>
        poi.id === id ? { ...poi, enabled: !poi.enabled } : poi
      ),
    })),

  setMaxDeviation: (deviation) => set({ maxDeviation: deviation }),

  setPOIs: (pois) => set({ pois }),

  togglePOI: (id) =>
    set((state) => ({
      pois: state.pois.map((poi) => (poi.id === id ? { ...poi, selected: !poi.selected } : poi)),
    })),

  reset: () =>
    set({
      originalRoute: null,
      modifiedRoute: null,
      gpxFileName: null,
      poiTypes: defaultPOITypes,
      maxDeviation: 5,
      pois: [],
    }),
}));
