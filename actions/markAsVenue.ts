"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function markAsVenue(id: number) {
  const supabase = createClient();
  await supabase.from("bookings").update({ status: true }).eq("id", id);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect("/login");
  }

  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (!data.hotel) {
    return;
  }

  const { data: profileData, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("push_token", null)
    .neq("id", user.id);

  if (error) {
    console.log(error);
    return;
  }
  profileData.forEach((profile) => {
    sendPushNotification(
      profile.push_token,
      data.hotel,
      user.user_metadata.username
    );
  });

  revalidatePath("/dashboard");
}

async function sendPushNotification(
  expoPushToken: string,
  hotel: any,
  username: string
) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title: `${username.charAt(0).toUpperCase() + username.slice(1)} marqué | ${hotel} | comme venue`,
    body: ``,
    data: { someData: "goes here" },
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(
        `Error sending push notification: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error("Error sending push notification", error);
  }
}
