using PanoramaViewer.Models;
using System.ComponentModel;

namespace PanoramaViewer.Demo.Models
{
    public class Panorama : IPanorama
    {
        public int id { get; set; }
        public int floorId { get; set; }
        public string dataUri { get; set; }
        public BindingList<PointOfInterest> pointsOfInterest { get; set; }
    }
}
