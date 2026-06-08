"use client";

import { useEffect, useState } from "react";
import { Dither, FlowingGradient, Group, ImageTexture, Shader, SineWave } from "shaders/react";

import { useShaderPreference } from "../lib/shader-preference";

export function ShaderBackground() {
  const { enabled, webgpuSupported } = useShaderPreference();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setVisible(!document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  if (!mounted || !enabled || webgpuSupported !== true || !visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-50"
      aria-hidden
    >
      <Shader className="size-full">
        <ImageTexture url="https://data.shaders.com/storage/v1/object/public/user-uploaded-images/user_3CHcBvnNzlgOZ56BQqZHj9n3mWN/sZpRysmSC_7S.jpg" />
        <ImageTexture
          url="https://data.shaders.com/storage/v1/object/public/user-uploaded-images/user_3CHcBvnNzlgOZ56BQqZHj9n3mWN/o-7kQ3pQUNZA.jpg"
          visible={false}
        />
        <ImageTexture
          url="https://data.shaders.com/storage/v1/object/public/user-uploaded-images/user_3CHcBvnNzlgOZ56BQqZHj9n3mWN/QyvMeY_6TakK.jpg"
          visible={false}
        />
        <Group>
          <SineWave visible={false} />
          <FlowingGradient />
          <Dither colorB="#1c90e8" visible />
        </Group>
      </Shader>
    </div>
  );
}
