using PanoramaViewer.Models;

namespace PanoramaViewer.Demo.Models
{
    public class PointOfInterest : IPointOfInterest
    {
        public int id { get; set; }
        public string name { get; set; }
        public string description { get; set; }
        public float entityId { get; set; }

        public float x { get; set; }
        public float y { get; set; }
        public float z { get; set; }

        public float[] position
        {
            get => new float[] { x, y, z };
            set
            {
                x = value[0];
                y = value[1];
                z = value[2];
            }
        }
    }
}
