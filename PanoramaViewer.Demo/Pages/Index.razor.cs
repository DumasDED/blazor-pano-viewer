using PanoramaViewer.Demo.Models;
using Microsoft.AspNetCore.Components;
using System.ComponentModel;

namespace PanoramaViewer.Demo.Pages
{
    public class IndexBase : ComponentBase
    {
        public int currentIndex { get; set; } = -1;
        public int selectedIndex { get; set; } = -1;

        public List<Panorama> Panoramas { get; set; } = new List<Panorama>();
        public Panorama currentPanorama { get; set; }
        public int currentPanoIndex { get; set; } = 0;

        public string currentPoiDescription
        {
            get
            {
                return currentPanorama != null && currentPanorama.pointsOfInterest.Count() != 0
                    ? 0 <= selectedIndex && selectedIndex < currentPanorama.pointsOfInterest.Count()
                    ? currentPanorama.pointsOfInterest[selectedIndex].description
                    : 0 <= currentIndex && currentIndex < currentPanorama.pointsOfInterest.Count()
                    ? currentPanorama.pointsOfInterest[currentIndex].description
                    : string.Empty
                    : string.Empty;
            }
        }

        private string[] descriptions = new string[]
            {
                "Look at me!",
                "Over here!",
                "Can you see me?",
                "What're you looking at?",
                "Why hello there!",
                "Isn't this interesting?"
            };
            
        protected override void OnInitialized()
        {
            var images = new string[]
            {
                "00000-pano.jpeg",
                "00001-pano.jpeg",
                "00002-pano.jpeg",
                "00003-pano.jpeg",
                "00004-pano.jpeg",
                "00005-pano.jpeg"
            };

            for (var i = 0; i < images.Length; i++)
            {
                Panoramas.Add(new Panorama { id = i + 1, dataUri = $"pano-images/{images[i]}", pointsOfInterest = new BindingList<PointOfInterest>() });
            }

            currentPanorama = Panoramas[currentPanoIndex];
        }

        public void OnHoveredIndexChange(int index)
        {
            currentIndex = index;
        }

        public void OnSelectedIndexChange(int index)
        {
            selectedIndex = index;
        }

        public void OnPoiCreated(PointOfInterest poi)
        {
            var ind = new Random().Next(0, descriptions.Length);
            poi.description = descriptions[ind];
        }

        public void NextImage()
        {
            currentPanoIndex = currentPanoIndex == Panoramas.Count - 1 ? 0 : currentPanoIndex + 1;
            currentPanorama = Panoramas[currentPanoIndex];
        }

        public void PreviousImage()
        {
            currentPanoIndex = currentPanoIndex == 0 ? Panoramas.Count - 1 : currentPanoIndex - 1;
            currentPanorama = Panoramas[currentPanoIndex];
        }

        public async void RemovePoi(int index)
        {
            currentPanorama.pointsOfInterest.RemoveAt(index);
        }
    }
}
