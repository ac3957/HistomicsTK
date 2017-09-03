
import View from 'girder/views/View';
import { apiRoot } from 'girder/rest';
import { formatSize } from 'girder/misc';

import router from '../router';
import editRegionOfInterest from '../templates/dialogs/editRegionOfInterest.pug';
import '../stylesheets/panels/zoomWidget.styl';

var EditRegionOfInterest = View.extend({
    events: {
        'change .update-form': 'updateform'
    },

    initialize() {
        this._sizeCte = 1000;    // Constante to find
        this._format = 'JPEG';    // JPEG is the default format
        this._compressionRatio = 0.35;    // JPEG ratio
        this._magnification = 0;
    },

    render() {
        if (this._magnification <= 1) {
            this._magnification = 1;
        } else if (this._magnification >= this.areaElement.maxMag) {
            this._magnification = this.areaElement.maxMag;
        }
        var bounds = this.scaleBounds();
        this.$el.html(
            editRegionOfInterest({
                magnification: this._magnification,
                scaleWidth: bounds.width,
                scaleHeight: bounds.height,
                maxMag: this.areaElement.maxMag,
                numberOfPixel: this.getNumberPixels(),
                fileSize: this.getConvertFileSize()
            })
        ).girderModal(this);
        this.updateform();
    },

    /**
     * Convert from zoom level to magnification.
     */
    zoomToMagnification(zoom) {
        return Math.round(parseFloat(this.areaElement.maxMag) *
            Math.pow(2, zoom - parseFloat(this.areaElement.maxZoom)) * 10) / 10;
    },

    /**
     * Convert from magnification to zoom level.
     */
    magnificationToZoom(magnification) {
        return parseFloat(this.areaElement.maxZoom) -
            Math.log2(this.areaElement.maxMag / magnification);
    },

    /**
     * Convert from magnification to zoom level.
     */
    scaleBounds() {
        var zoom = this.magnificationToZoom(this._magnification);
        var factor = Math.pow(2, zoom - this.areaElement.maxZoom);
        var scaleWidth = Math.round(factor * this.areaElement.width);
        var scaleHeight = Math.round(factor * this.areaElement.height);
        return { 'width': scaleWidth, 'height': scaleHeight };
    },

    /**
     * Get the number of pixel in the region of interest
     */
    getNumberPixels() {
        var bounds = this.scaleBounds();
        var Npixel = bounds.width * bounds.height;
        return Npixel;
    },

    /**
     * Get the size of the file before download it for an image in 24b/px (result in Bytes)
     */
    getFileSize() {
        var fileSize = (this.getNumberPixels() * 3 + this._sizeCte) * this._compressionRatio;
        return fileSize;
    },

    /**
     * Get the size of the file in the appropriate unity (Bytes, MB, GB...)
     */
    getConvertFileSize() {
        var Nbytes = this.getFileSize();
        var convertedSize = formatSize(Nbytes);
        if (Nbytes >= Math.pow(2, 30)) {
            this.downloadDisable(true);
        } else {
            this.downloadDisable(false);
        }
        return convertedSize;
    },

    /**
     * Disable the Download button if SizeFile > 1GB
     */
    downloadDisable(bool) {
        var element = $('#msgDisable').attr('id');
        if (bool === true) {
            $('#download-submit').attr('disabled', 'disabled');
            if (typeof element === typeof undefined) {
                var msgDisable = $('<span></span>').text('Size > 1GB : Impossible Download ');
                msgDisable.attr('id', 'msgDisable');
                msgDisable.css({'color': 'red', 'margin-right': '120px'});
                $('#download-area-link').before(msgDisable);
            }
        } else if (bool === false) {
            $('#download-submit').removeAttr('disabled');
            if (typeof element !== typeof undefined) {
                $('#msgDisable').remove();
            }
        } else {
            console.log('Error in \'downloadDisable\' function');
        }
    },

    /**
     * Set the size of the file, bounds, format...
     * And download the image
     */
    updateform(evt) {
        // Find the good compresion ration there are random now
        var selectedOption = $('#download-image-format option:selected').text();
        switch (selectedOption) {
            case 'JPEG':     //     JPEG
                this._format = 'JPEG';
                this._compressionRatio = 0.35;
                break;
            case 'PNG':     //  PNG
                this._format = 'PNG';
                this._compressionRatio = 0.7;
                break;
            case 'TIFF':     // TIFF
                this._format = 'TIFF';
                this._compressionRatio = 0.8;
                break;
            default:     // JPEG is the default format
                this._compressionRatio = 0.35;
        }
        this._magnification = parseFloat($('#h-element-mag').val());
        var bounds = this.scaleBounds();
        $('#h-element-width').val(bounds.width);
        $('#h-element-height').val(bounds.height);
        $('#nb-pixel').val(this.getNumberPixels());
        $('#size-file').val(this.getConvertFileSize());
        var url = this.getUrl();
        this.$('#download-area-link').attr('href', url);
    },

    /**
     * Get all data from the form and set the attributes of the
     * Region of Interest (triggering a change event)
     * Return the url to download the image
     */
    getUrl() {
        var imageId = router.getQuery('image');
        var left = this.areaElement.left;
        var top = this.areaElement.top;
        var right = left + this.areaElement.width;
        var bottom = top + this.areaElement.height;
        var magnification = parseFloat($('#h-element-mag').val());
        var params = $.param({
            regionWidth: this.areaElement.width,
            regionHeight: this.areaElement.height,
            left: left,
            top: top,
            right: right,
            bottom: bottom,
            encoding: this._format,
            contentDisposition: 'attachment',
            magnification: magnification
        });
        var urlArea = `/${apiRoot}/item/${imageId}/tiles/region?${params}`;
        return urlArea;
    }
});

/**
 * Create a singleton instance of this widget that will be rendered
 * when `show` is called.
 */
var dialog = new EditRegionOfInterest({
    parentView: null
});

/**
 * Show the edit dialog box.  Watch for change events on the passed
 * `ElementModel` to respond to user submission of the form.
 *
 * @param {ElementModel} areaElement The element to edit
 * @returns {EditRegionOfInterest} The dialog's view
 */
function show(areaElement) {
    dialog.areaElement = areaElement;
    dialog._magnification = parseFloat(areaElement.magnification);
    dialog.setElement('#g-dialog-container').render();
    return dialog;
}

export default show;
