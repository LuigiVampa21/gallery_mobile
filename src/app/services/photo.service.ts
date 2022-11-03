import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { UserPhoto } from '../shared/interfaces/user-photo.interface';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  public photos: UserPhoto[] = [];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private PHOTO_STORAGE = 'photos';

  constructor(private platform: Platform) { }

  public async addNewToGallery() {
    // Take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });

    const savedImageFile = await this.savePicture(capturedPhoto);
    this.photos.unshift(savedImageFile);

    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });
  }

  public async loadSaved() {
    // Retrieve cached photo array data
    const photoList = await Preferences.get({ key: this.PHOTO_STORAGE });
    this.photos = JSON.parse(photoList.value) || [];
    if (!this.platform.is('hybrid')) {
    for (const photo of this.photos) {

      // Read each saved photo's data from the Filesystem
      const readFile = await Filesystem.readFile({
        path: photo.filepath,
        directory: Directory.Data,
      });

      // Web platform only: Load the photo as base64 data
      photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
    }
   }
  }

  private async savePicture(photo: Photo) {
    const base64Data = await this.readAsBase64(photo);

    const fileName = new Date().getTime() + '.jpeg';
  const savedFile = await Filesystem.writeFile({
    path: fileName,
    data: base64Data,
    directory: Directory.Data
  });
  if (this.platform.is('hybrid')) {
    // Display the new image by rewriting the 'file://' path to HTTP
    return {
      filepath: savedFile.uri,
      webviewPath: Capacitor.convertFileSrc(savedFile.uri),
    };
  }else{
    return {
      filepath: fileName,
      webviewPath: photo.webPath
    };
  }
   }

   private async readAsBase64(photo: Photo) {
      // "hybrid" will detect Cordova or Capacitor
  if (this.platform.is('hybrid')) {
    // Read the file into base64 format
    const file = await Filesystem.readFile({
      path: photo.path
    });

    return file.data;
  } else {

    // Fetch the photo, read as a blob, then convert to base64 format
    const response = await fetch(photo.webPath);
    const blob = await response.blob();

    return await this.convertBlobToBase64(blob) as string;
  }
  }

  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
        resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}
