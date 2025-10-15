export type PhotoLike = {
  uri: string;
  width: number;
  height: number;
};

export type BBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropBoxProps = {
  imageSize: {
    width: number;
    height: number;
  };
  value: BBox;
  onChange: (box: BBox) => void;
};