export interface TextStyle {
  family?: string;
  size?: number; // relative size percentage or explicit pt/px
  weight?: "light" | "normal" | "medium" | "semibold" | "bold" | "black";
  letterSpacing?: number;
  lineHeight?: number;
}

export interface CustomFont {
  name: string;
  url: string;
  format: string;
}

export interface PhotoSettings {
  shape?: "circle" | "rounded" | "square" | "portrait" | "custom";
  width?: number; // relative size percentage
  height?: number; // relative size percentage
  borderThickness?: number;
  borderColor?: string;
  borderRadius?: number; // for custom shape
  frameStyle?: "none" | "modern" | "premium" | "minimal" | "branded";
  fitMode?: "cover" | "contain" | "fill" | "smart";
  position?: "center" | "left" | "right";
}

export interface IdCardTemplate {
  layout: "corporate" | "glass" | "minimal" | "executive" | "dark" | "gradient" | "horizontal";
  size: "pvc" | "pocket" | "hanging" | "custom";
  customSize?: { width: number; height: number };
  photoSettings?: PhotoSettings;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    border: string;
    headerText?: string;
  };
  fonts: {
    family: string;
    size: "small" | "medium" | "large";
    weight: "normal" | "bold" | "bolder";
    
    // Advanced Typography
    customFonts?: CustomFont[];
    schoolName?: TextStyle;
    studentName?: TextStyle;
    cardTitle?: TextStyle;
    contactInfo?: TextStyle;
    qrInfo?: TextStyle;
    barcodeInfo?: TextStyle;
  };
  elements: {
    schoolLogo: boolean;
    studentPhoto: boolean;
    photoShape?: "circle" | "square" | "rounded";
    qrCode: boolean;
    barcode: boolean;
    grade: boolean;
    className: boolean;
    examNumber: boolean;
    issueDate: boolean;
    expiryDate: boolean;
    signature: boolean;
    stamp: boolean;
    parentPhone?: boolean;
    parentEmail?: boolean;
    driverPhone?: boolean;
    carNumber?: boolean;
    guardianName?: boolean;
    driverName?: boolean;
    schoolPhone?: boolean;
  };
  background: {
    type: "solid" | "pattern" | "image" | "watermark";
    imageUrl?: string;
    watermarkText?: string;
    watermarkOpacity?: number;
    watermarkScale?: number;
  };
  printSettings: {
    doubleSided: boolean;
    copies: number;
    showCropMarks: boolean;
    quality: "standard" | "high";
  };
}
