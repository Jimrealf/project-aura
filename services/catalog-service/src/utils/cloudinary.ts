import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = async (buffer: Buffer, originalname: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "aura/products",
                public_id: `${Date.now()}-${originalname.split(".")[0]}`,
            },
            (error, result) => {
                if (error) {
                    console.error("[Cloudinary Error]", error);
                    return reject(new Error("Image upload failed"));
                }
                if (result) resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

export const deleteImage = async (imageUrl: string): Promise<void> => {
    try {
        const parts = imageUrl.split("/");
        const filename = parts.pop()?.split(".")[0];
        const folder = parts.pop();
        const parentFolder = parts.pop();
        if (filename && folder && parentFolder) {
            const publicId = `${parentFolder}/${folder}/${filename}`;
            await cloudinary.uploader.destroy(publicId);
        }
    } catch (error) {
        console.error("[Cloudinary Delete Error]", error);
    }
};
