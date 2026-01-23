const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const uploadToS3 = async (files) => {
  try {
    const uploadPromises = files.map(file => {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `ooh-images/${Date.now()}-${uuidv4()}-${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype
      };

      return s3.upload(params).promise();
    });

    const results = await Promise.all(uploadPromises);
    return results.map(result => result.Location);
  } catch (error) {
    console.error('Error al subir a S3:', error);
    throw new Error('Error al subir imágenes al bucket');
  }
};

const deleteFromS3 = async (imageUrl) => {
  try {
    const key = imageUrl.split('.amazonaws.com/')[1];
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    };

    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error('Error al eliminar de S3:', error);
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3
};
