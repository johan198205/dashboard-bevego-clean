import Image from "next/image";

export function Logo() {
  return (
    <div className="relative h-12 max-w-[12rem]">
      <Image
        src="/Logo.svg"
        fill
        alt="Bevego"
        role="img"
        quality={100}
        className="object-contain"
      />
    </div>
  );
}
