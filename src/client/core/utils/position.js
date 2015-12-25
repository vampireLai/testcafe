/* global isIFrameWithoutSrc:true */
import hammerhead from '../deps/hammerhead';
import * as styleUtils from './style';
import * as domUtils from './dom';


export function getIFrameCoordinates (iFrameWin) {
    var iFrame              = domUtils.getIframeByWindow(iFrameWin);
    var iFrameOffset        = getOffsetPosition(iFrame);
    var iFrameBorders       = styleUtils.getBordersWidth(iFrame);
    var iFramePadding       = styleUtils.getElementPadding(iFrame);
    var iFrameRectangleLeft = iFrameOffset.left + iFrameBorders.left + iFramePadding.left;
    var iFrameRectangleTop  = iFrameOffset.top + iFrameBorders.top + iFramePadding.top;

    return {
        left:   iFrameRectangleLeft,
        top:    iFrameRectangleTop,
        right:  iFrameRectangleLeft + styleUtils.getWidth(iFrame),
        bottom: iFrameRectangleTop + styleUtils.getHeight(iFrame)
    };
}

export function isElementVisible (el) {
    if (domUtils.isTextNode(el))
        return !styleUtils.isNotVisibleNode(el);

    var elementRectangle = getElementRectangle(el);

    if (!domUtils.isContentEditableElement(el)) {
        if (elementRectangle.width === 0 || elementRectangle.height === 0)
            return false;
    }

    if (domUtils.isMapElement(el)) {
        var mapContainer = domUtils.getMapContainer(domUtils.closest(el, 'map'));

        return mapContainer ? isElementVisible(mapContainer) : false;
    }
    else if (styleUtils.isVisibleChild(el)) {
        var select              = domUtils.getSelectParent(el);
        var childRealIndex      = domUtils.getChildVisibleIndex(select, el);
        var realSelectSizeValue = styleUtils.getSelectElementSize(select);
        var topVisibleIndex     = Math.max(styleUtils.getScrollTop(select) / styleUtils.getOptionHeight(select), 0);
        var bottomVisibleIndex  = topVisibleIndex + realSelectSizeValue - 1;
        var optionVisibleIndex  = Math.max(childRealIndex - topVisibleIndex, 0);

        return optionVisibleIndex >= topVisibleIndex && optionVisibleIndex <= bottomVisibleIndex;
    }
    else if (domUtils.isSVGElement(el))
        return styleUtils.get(el, 'visibility') !== 'hidden' && styleUtils.get(el, 'display') !== 'none';
    else
        return styleUtils.hasDimensions(el) && styleUtils.get(el, 'visibility') !== 'hidden';
}

export function getClientDimensions (target) {
    if (!domUtils.isDomElement(target)) {
        var clientPoint = offsetToClientCoords(target);

        return {
            border: {
                bottom: 0,
                left:   0,
                right:  0,
                top:    0
            },
            bottom: clientPoint.y,
            height: 0,
            left:   clientPoint.x,
            right:  clientPoint.x,
            scroll: {
                left: 0,
                top:  0
            },
            top:    clientPoint.y,
            width:  0
        };
    }

    var isHtmlElement       = /html/i.test(target.tagName);
    var body                = isHtmlElement ? target.getElementsByTagName('body')[0] : null;
    var elementBorders      = styleUtils.getBordersWidth(target);
    var elementRect         = target.getBoundingClientRect();
    var elementScroll       = styleUtils.getElementScroll(target);
    var isElementInIFrame   = domUtils.isElementInIframe(target);
    var elementLeftPosition = isHtmlElement ? 0 : elementRect.left;
    var elementTopPosition  = isHtmlElement ? 0 : elementRect.top;
    var elementHeight       = isHtmlElement ? target.clientHeight : elementRect.height;
    var elementWidth        = isHtmlElement ? target.clientWidth : elementRect.width;

    if (isHtmlElement && (typeof isIFrameWithoutSrc === 'boolean' && isIFrameWithoutSrc) && body) {
        elementHeight = body.clientHeight;
        elementWidth  = body.clientWidth;
    }

    if (isElementInIFrame) {
        var iFrameElement = domUtils.getIframeByElement(target);

        if (iFrameElement) {
            var iFrameOffset  = getOffsetPosition(iFrameElement);
            var clientOffset  = offsetToClientCoords({
                x: iFrameOffset.left,
                y: iFrameOffset.top
            });
            var iFrameBorders = styleUtils.getBordersWidth(iFrameElement);

            elementLeftPosition += clientOffset.x + iFrameBorders.left;
            elementTopPosition += clientOffset.y + iFrameBorders.top;

            if (isHtmlElement) {
                elementBorders.bottom = elementBorders.bottom + iFrameBorders.bottom;
                elementBorders.left   = elementBorders.left + iFrameBorders.left;
                elementBorders.right  = elementBorders.right + iFrameBorders.right;
                elementBorders.top    = elementBorders.top + iFrameBorders.top;
            }
        }
    }

    return {
        border:    elementBorders,
        bottom:    elementTopPosition + elementHeight,
        height:    elementHeight,
        left:      elementLeftPosition,
        right:     elementLeftPosition + elementWidth,
        scroll:    {
            left: elementScroll.left,
            top:  elementScroll.top
        },
        scrollbar: {
            right:  isHtmlElement ||
                    styleUtils.getInnerWidth(target) === target.clientWidth ? 0 : domUtils.getScrollbarSize(),
            bottom: isHtmlElement ||
                    styleUtils.getInnerHeight(target) === target.clientHeight ? 0 : domUtils.getScrollbarSize()
        },
        top:       elementTopPosition,
        width:     elementWidth
    };
}

export function isContainOffset (el, offsetX, offsetY) {
    var dimensions = getClientDimensions(el);
    var maxX       = dimensions.scrollbar.right + dimensions.border.left + dimensions.border.right + el.scrollWidth;
    var maxY       = dimensions.scrollbar.bottom + dimensions.border.top + dimensions.border.bottom +
                     el.scrollHeight;

    return (typeof offsetX === 'undefined' || (offsetX >= 0 && maxX >= offsetX)) &&
           (typeof offsetY === 'undefined' || ( offsetY >= 0 && maxY >= offsetY));
}

export function getEventAbsoluteCoordinates (ev) {
    var el              = ev.target || ev.srcElement;
    var pageCoordinates = getEventPageCoordinates(ev);
    var curDocument     = domUtils.findDocument(el);
    var xOffset         = 0;
    var yOffset         = 0;

    if (domUtils.isElementInIframe(curDocument.documentElement)) {
        var currentIFrame = domUtils.getIframeByElement(curDocument);

        if (currentIFrame) {
            var iFrameOffset  = getOffsetPosition(currentIFrame);
            var iFrameBorders = styleUtils.getBordersWidth(currentIFrame);

            xOffset = iFrameOffset.left + iFrameBorders.left;
            yOffset = iFrameOffset.top + iFrameBorders.top;
        }
    }

    return {
        x: pageCoordinates.x + xOffset,
        y: pageCoordinates.y + yOffset
    };
}

export function getEventPageCoordinates (ev) {
    var curCoordObject = /^touch/.test(ev.type) && ev.targetTouches ? (ev.targetTouches[0] ||
                                                                       ev.changedTouches[0]) : ev;

    if ((curCoordObject.pageX === null || (curCoordObject.pageX === 0 && curCoordObject.pageY === 0 &&
                                           (curCoordObject.clientX !== 0 || curCoordObject.clientY !== 0))) &&
        curCoordObject.clientX !== null) {

        var currentDocument = domUtils.findDocument(ev.target || ev.srcElement);
        var html            = currentDocument.documentElement;
        var body            = currentDocument.body;

        return {
            x: Math.round(curCoordObject.clientX + (html && html.scrollLeft || body && body.scrollLeft || 0) -
                          (html.clientLeft || 0)),
            y: Math.round(curCoordObject.clientY + (html && html.scrollTop || body && body.scrollTop || 0) -
                          (html.clientTop || 0))
        };
    }
    return {
        x: Math.round(curCoordObject.pageX),
        y: Math.round(curCoordObject.pageY)
    };
}

export function getElementFromPoint (x, y, currentDocument, skipIFramesDeeping) {
    var el = null;

    currentDocument = currentDocument || document;
    var func        = currentDocument.getElementFromPoint || currentDocument.elementFromPoint;

    try {
        // Permission denied to access property 'getElementFromPoint' error in iFrame
        el = func.call(currentDocument, x, y);
    } catch (ex) {
        return null;
    }

    //NOTE: elementFromPoint returns null when is's a border of an iframe
    if (el === null)
        el = func.call(currentDocument, x - 1, y - 1);

    if (el && el.tagName.toLowerCase() === 'iframe' && !skipIFramesDeeping) {
        var iframeDocument = null;

        try {
            iframeDocument = el.contentDocument;
        } catch (e) {
            //cross-domain iframe
        }

        if (iframeDocument) {
            var iframePosition       = getOffsetPosition(el);
            var iframeClientPosition = offsetToClientCoords({
                x: iframePosition.left,
                y: iframePosition.top
            }, currentDocument);
            var iframeBorders        = styleUtils.getBordersWidth(el);
            var iframePadding        = styleUtils.getElementPadding(el);

            el = getElementFromPoint(
                    x - iframeClientPosition.x - iframeBorders.left - iframePadding.left,
                    y - iframeClientPosition.y - iframeBorders.top - iframePadding.top,
                    iframeDocument
                ) || el;
        }
    }

    return el;
}

export function getFixedPositionForIFrame (pos, iFrameWin) {
    var iFrame        = domUtils.getIframeByWindow(iFrameWin);
    var iFrameOffset  = getOffsetPosition(iFrame);
    var iFrameBorders = styleUtils.getBordersWidth(iFrame);
    var iFramePadding = styleUtils.getElementPadding(iFrame);

    return {
        x: pos.x - iFrameOffset.left - iFrameBorders.left - iFramePadding.left,
        y: pos.y - iFrameOffset.top - iFrameBorders.top - iFramePadding.top
    };
}

export function getFixedPosition (pos, iFrameWin, convertToClient) {
    if (!iFrameWin)
        return pos;

    var iFrame         = domUtils.getIframeByWindow(iFrameWin);
    var iFrameOffset   = getOffsetPosition(iFrame);
    var iFrameBorders  = styleUtils.getBordersWidth(iFrame);
    var iFramePadding  = styleUtils.getElementPadding(iFrame);
    var documentScroll = styleUtils.getElementScroll(document);

    return {
        x: pos.x + iFrameOffset.left + iFrameBorders.left + iFramePadding.left -
           (convertToClient ? documentScroll.left : 0),
        y: pos.y + iFrameOffset.top + iFrameBorders.top + iFramePadding.top -
           (convertToClient ? documentScroll.top : 0)
    };
}

export function clientToOffsetCoord (coords, currentDocument) {
    var doc = currentDocument || document;

    return {
        x: coords.x + styleUtils.getScrollLeft(doc),
        y: coords.y + styleUtils.getScrollTop(doc)
    };
}

export function findCenter (el) {
    var rectangle = getElementRectangle(el);

    return {
        x: Math.round(rectangle.left + rectangle.width / 2),
        y: Math.round(rectangle.top + rectangle.height / 2)
    };
}

export function getElementClientRectangle (el) {
    var rect      = getElementRectangle(el);
    var clientPos = offsetToClientCoords({
        x: rect.left,
        y: rect.top
    });

    return {
        height: rect.height,
        left:   clientPos.x,
        top:    clientPos.y,
        width:  rect.width
    };
}

export function calcRelativePosition (dimensions, toDimensions) {
    return {
        left:   dimensions.left - (toDimensions.left + toDimensions.border.left),
        right:  toDimensions.right - toDimensions.border.right - toDimensions.scrollbar.right - dimensions.right,
        top:    dimensions.top - (toDimensions.top + toDimensions.border.top),
        bottom: toDimensions.bottom - toDimensions.border.bottom - toDimensions.scrollbar.bottom - dimensions.bottom
    };
}

export var getElementRectangle  = hammerhead.utils.position.getElementRectangle;
export var getOffsetPosition    = hammerhead.utils.position.getOffsetPosition;
export var offsetToClientCoords = hammerhead.utils.position.offsetToClientCoords;
