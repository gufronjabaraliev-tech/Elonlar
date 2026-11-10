import { useState } from "react";
import { ImagePlus, Loader2, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { SideScroll } from "@/components/SideScroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fileToJpeg } from "@/lib/image-file";
import { CATEGORIES, imageUrl } from "@/lib/telegram";
import { uploadListingImage, type ListingAttributes, type ListingInput } from "@/lib/listings.functions";

export function ListingForm({
  initData,
  initial,
  imageToken,
  submitting,
  submitLabel,
  forAdmin = false,
  onSubmit,
}: {
  initData: string;
  initial?: Partial<ListingInput>;
  imageToken?: string | null;
  submitting: boolean;
  submitLabel: string;
  forAdmin?: boolean;
  onSubmit: (payload: ListingInput) => void;
}) {
  const [category, setCategory] = useState(initial?.category ?? "uy");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ? String(initial.price) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? "UZS");
  const [city, setCity] = useState(initial?.city ?? "");
  const [lat, setLat] = useState(
    initial?.attributes?.lat || initial?.attributes?.lat === 0 ? String(initial.attributes.lat) : "",
  );
  const [lng, setLng] = useState(
    initial?.attributes?.lng || initial?.attributes?.lng === 0 ? String(initial.attributes.lng) : "",
  );
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [rooms, setRooms] = useState(initial?.attributes?.rooms ? String(initial.attributes.rooms) : "");
  const [area, setArea] = useState(initial?.attributes?.area ? String(initial.attributes.area) : "");
  const [year, setYear] = useState(initial?.attributes?.year ? String(initial.attributes.year) : "");
  const [mileage, setMileage] = useState(
    initial?.attributes?.mileage || initial?.attributes?.mileage === 0
      ? String(initial.attributes.mileage)
      : "",
  );
  const [uploading, setUploading] = useState(false);

  const upload = useServerFn(uploadListingImage);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 10 - images.length)) {
        const dataUrl = await fileToJpeg(file);
        const { path } = await upload({
          data: forAdmin ? { initData, dataUrl, forAdmin: true } : { initData, dataUrl },
        });
        setPreviews((prev) => ({ ...prev, [path]: dataUrl }));
        setImages((prev) => [...prev, path]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rasm yuklanmadi");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const attributes: ListingAttributes = {};
        if (category === "uy") {
          if (rooms) attributes.rooms = Number(rooms);
          if (area) attributes.area = Number(area);
        }
        if (category === "mashina") {
          if (year) attributes.year = Number(year);
          if (mileage) attributes.mileage = Number(mileage);
        }
        if (lat && lng) {
          attributes.lat = Number(lat);
          attributes.lng = Number(lng);
        }
        onSubmit({
          category,
          title,
          description,
          price: Number(price || 0),
          currency,
          city,
          phone,
          images,
          attributes,
        });
      }}
    >
      <div className="space-y-2">
        <Label>Bo'lim</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {category === "uy" ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="rooms">Xonalar</Label>
            <Input
              id="rooms"
              inputMode="numeric"
              value={rooms}
              onChange={(e) => setRooms(e.target.value.replace(/\D/g, ""))}
              placeholder="3"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="area">Maydon, m²</Label>
            <Input
              id="area"
              inputMode="numeric"
              value={area}
              onChange={(e) => setArea(e.target.value.replace(/\D/g, ""))}
              placeholder="68"
              className="rounded-xl"
            />
          </div>
        </div>
      ) : null}

      {category === "mashina" ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="year">Yil</Label>
            <Input
              id="year"
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="2022"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mileage">Probeg, km</Label>
            <Input
              id="mileage"
              inputMode="numeric"
              value={mileage}
              onChange={(e) => setMileage(e.target.value.replace(/\D/g, ""))}
              placeholder="41000"
              className="rounded-xl"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="title">Sarlavha</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masalan: 3 xonali kvartira"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="price">Narx</Label>
          <Input
            id="price"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            placeholder="0"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Valyuta</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UZS">so'm</SelectItem>
              <SelectItem value="USD">$</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">Joylashuv</Label>
        <Input
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Tuman, ko'cha yoki mo'ljal"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              if (!navigator.geolocation) {
                toast.error("Bu qurilma joylashuvni bilmaydi");
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setLat(pos.coords.latitude.toFixed(6));
                  setLng(pos.coords.longitude.toFixed(6));
                  toast.success("Joylashuv belgilandi");
                },
                () => toast.error("Joylashuvga ruxsat berilmadi"),
              );
            }}
          >
            <MapPin className="h-4 w-4" /> Belgilash
          </Button>
          {lat && lng ? (
            <span className="text-xs text-muted-foreground">
              {lat}, {lng}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Xaritada nuqta belgilanmagan</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefon raqam</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998 90 123 45 67"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Tavsif</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="Batafsil ma'lumot..."
        />
      </div>

      <div className="space-y-2">
        <Label>Rasmlar ({images.length}/10)</Label>
        <SideScroll className="gap-2">
          {images.map((img) => (
            <div key={img} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border">
              <img
                src={previews[img] ?? imageUrl(img, imageToken)}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setImages((p) => p.filter((i) => i !== img))}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                aria-label="O'chirish"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {images.length < 10 ? (
            <label className="inline-flex h-20 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 text-sm text-muted-foreground">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              Xotiradan yuklash
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={uploading}
                aria-label="Xotiradan yuklash"
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          ) : null}
        </SideScroll>
      </div>

      <Button type="submit" size="lg" className="w-full rounded-2xl" disabled={submitting}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}
