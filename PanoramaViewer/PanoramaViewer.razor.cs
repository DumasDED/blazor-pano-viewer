using PanoramaViewer.Models;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using System.ComponentModel;

namespace PanoramaViewer
{
    public class PanoramaViewerBase<TPointOfInterest> : ComponentBase where TPointOfInterest : IPointOfInterest
    {
        [Inject] public IJSRuntime JSRuntime { get; set; }

        private bool _componentIsRendered = false;

        private Task<IJSObjectReference> _module;
        private Task<IJSObjectReference> Module => _module ??= JSRuntime.InvokeAsync<IJSObjectReference>("import", "./_content/PanoramaViewer/js/index.js").AsTask();

        private IPanorama _panorama;
        private BindingList<TPointOfInterest> _pointsOfInterest;

        /// <summary>
        /// The <see cref="Panorama"/> object to be displayed.
        /// </summary>
        [Parameter]
        public IPanorama Panorama
        {
            get => _panorama;
            set
            {
                if (_panorama != value)
                {
                    _panorama = value;
                    if (_componentIsRendered)
                    {
                        Module.Result.InvokeVoidAsync("loadPanorama", new[] { _panorama }).ConfigureAwait(false);
                    }
                }
            }
        }

        /// <summary>
        /// The list of points of interest to be displayed for the given <see cref="Panorama"/> object. Must be provided
        /// as a <see cref="BindingList{PointOfInterest}"/>.
        /// </summary>
        [Parameter]
        public BindingList<TPointOfInterest> PointsOfInterest
        {
            get => _pointsOfInterest;
            set
            {
                if (_pointsOfInterest != value || _pointsOfInterest.SequenceEqual(value))
                {
                    _pointsOfInterest = value;
                    _pointsOfInterest.RaiseListChangedEvents = true;
                    _pointsOfInterest.ListChanged += (_, _) => Module.Result.InvokeVoidAsync("refreshPointsOfInterest", new[] { _pointsOfInterest }).ConfigureAwait(false);
                    if (_componentIsRendered)
                    {
                        Module.Result.InvokeVoidAsync("refreshPointsOfInterest", new[] { _pointsOfInterest }).ConfigureAwait(false);
                    }
                }
            }
        }

        /// <summary>
        /// Allow points of interest to be selected by clicking on them.
        /// </summary>
        [Parameter] public bool AllowPoiSelect { get; set; } = true;

        /// <summary>
        /// Allow points of interest to be created by double-clicking anywhere on the panorama image.
        /// </summary>
        [Parameter] public bool AllowPoiCreate { get; set; } = true;

        /// <summary>
        /// Allow points of interest to be removed by double-clicking on them.
        /// </summary>
        [Parameter] public bool AllowPoiRemove { get; set; } = true;

        /// <summary>
        /// Callback to be invoked whenever a user mouses over or out of a point of interest.
        /// </summary>
        [Parameter] public EventCallback<int> HoveredIdxCallback { get; set; }

        /// <summary>
        /// Callback to be invoked whenever a user clicks on a point of interest.
        /// </summary>
        [Parameter] public EventCallback<int> SelectedIdxCallback { get; set; }

        /// <summary>
        /// Callback to be invoked whenever a user creates a new point of interest.
        /// </summary>
        [Parameter] public EventCallback<TPointOfInterest> PoiCreateCallback { get; set; }

        /// <summary>
        /// Callback to be invoked whenever a user deletes an existing point of interest.
        /// </summary>
        [Parameter] public EventCallback<int> PoiRemoveCallback { get; set; }

        protected override async Task OnAfterRenderAsync(bool firstRender)
        {
            _componentIsRendered = true;

            if (firstRender)
            {
                var module = await Module;

                await module.InvokeVoidAsync("getDotNetRef", DotNetObjectReference.Create(this));

                await module.InvokeVoidAsync("init", new object[] {
                    _panorama,
                    new {
                        select = AllowPoiSelect,
                        create = AllowPoiCreate,
                        remove = AllowPoiRemove
                    }
                });
                await module.InvokeVoidAsync("animate");
            }
        }

        [JSInvokable]
        public void OnPoiMouseOver(int index)
        {
            HoveredIdxCallback.InvokeAsync(index);
        }

        [JSInvokable]
        public void OnPoiMouseOut()
        {
            HoveredIdxCallback.InvokeAsync(-1);
        }

        [JSInvokable]
        public void OnPoiSelected(int index)
        {
            SelectedIdxCallback.InvokeAsync(index);
        }

        [JSInvokable]
        public void OnPoiCreated(TPointOfInterest poi)
        {
            _pointsOfInterest.Add(poi);

            PoiCreateCallback.InvokeAsync(poi);
        }

        [JSInvokable]
        public void OnPoiRemoved(int index)
        {
            _pointsOfInterest.RemoveAt(index);

            PoiRemoveCallback.InvokeAsync(index);
        }

        public async Task CreatePoi(TPointOfInterest poi)
        {
            await Module.Result.InvokeVoidAsync("addPointOfInterest", poi);
        }

        public async Task RemovePoi(int index)
        {
            await Module.Result.InvokeVoidAsync("removePointOfInterest", index);
        }

        public async Task RefreshPois(List<TPointOfInterest> pois)
        {
            await Module.Result.InvokeVoidAsync("refreshPointsOfInterest", pois);
        }
    }
}
